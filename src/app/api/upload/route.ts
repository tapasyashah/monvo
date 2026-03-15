import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  extractTextFromPdf,
  detectFormat,
  parseTransactionsWithClaude,
  resolveInstitutionAndType,
} from "@/lib/extract";
import { canonicalMerchant } from "@/lib/merchantNormalize";
import { classifyTransaction } from "@/lib/classifiers/transfer-classifier";
import {
  detectStatementType,
  isInvestmentStatement,
} from "@/lib/parsers/statement-types";
import { parseWealthsimpleStatement } from "@/lib/parsers/wealthsimple-parser";
import { parsePrimericaStatement } from "@/lib/parsers/primerica-parser";

const VALID_ACCOUNT_TYPES = ["chequing", "savings", "credit_card"] as const;
type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

function isValidAccountType(value: string): value is AccountType {
  return (VALID_ACCOUNT_TYPES as readonly string[]).includes(value);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth: require a logged-in session.
  // Use getSession() (local cookie read) instead of getUser() (network call to Supabase auth
  // server) to avoid ConnectTimeoutErrors that cause spurious 401s in Route Handlers.
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Bad request: invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const institution = formData.get("institution");
  const accountTypeRaw = formData.get("account_type");

  // Validate: file must be present and be a File object
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Bad request: file is required" },
      { status: 400 }
    );
  }

  // Validate: file must be a PDF
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json(
      { error: "Bad request: file must be a PDF" },
      { status: 400 }
    );
  }

  // Generate a unique ID for this statement
  const statementId = crypto.randomUUID();

  // Derive statement_month: default to first day of current month
  const now = new Date();
  const statement_month = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Read file into Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Auto-detect or use provided institution/account_type
  let cachedText: string | null = null;
  let institution_resolved: string;
  let account_type_resolved: AccountType;

  const providedInstitution = typeof institution === "string" && institution.trim().length > 0;
  const providedAccountType = typeof accountTypeRaw === "string" && isValidAccountType(accountTypeRaw);

  if (providedInstitution && providedAccountType) {
    institution_resolved = (institution as string).trim();
    account_type_resolved = accountTypeRaw as AccountType;
  } else {
    cachedText = await extractTextFromPdf(buffer);
    const format = detectFormat(cachedText);
    const resolved = resolveInstitutionAndType(format, cachedText);
    institution_resolved = resolved.institution;
    account_type_resolved = resolved.account_type;
  }

  // --- Investment statement branch ---
  // Detect whether this is an investment/annual statement (Wealthsimple, Primerica).
  // If so, parse with the dedicated parser, upsert into user_assets, and return early.
  const pdfTextForDetection = cachedText ?? await extractTextFromPdf(buffer);
  // Cache for later use in bank statement path
  if (!cachedText) cachedText = pdfTextForDetection;

  const statementType = detectStatementType(pdfTextForDetection);

  if (isInvestmentStatement(statementType)) {
    try {
      const investmentData =
        statementType === "wealthsimple_annual"
          ? parseWealthsimpleStatement(pdfTextForDetection)
          : parsePrimericaStatement(pdfTextForDetection);

      // Upload PDF to storage
      const storagePath = `${user.id}/${statementId}.pdf`;
      const { error: storageError } = await supabaseAdmin.storage
        .from("statements")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (storageError) {
        return NextResponse.json(
          { error: `Storage upload failed: ${storageError.message}` },
          { status: 500 }
        );
      }

      // Upsert into user_assets table.
      // Uses institution + user_id as the natural key so re-uploading an
      // updated annual statement overwrites the previous snapshot.
      const { error: assetError } = await supabaseAdmin
        .from("user_assets")
        .upsert(
          {
            user_id: user.id,
            institution: investmentData.institution,
            statement_type: investmentData.statement_type,
            period_start: investmentData.period_start || null,
            period_end: investmentData.period_end || null,
            total_value: investmentData.total_value,
            ytd_contributions: investmentData.ytd_contributions,
            ytd_withdrawals: investmentData.ytd_withdrawals,
            ytd_gains: investmentData.ytd_gains,
            tfsa_room_used: investmentData.tfsa_room_used ?? null,
            holdings: investmentData.holdings ?? null,
            storage_path: storagePath,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,institution" }
        );

      if (assetError) {
        return NextResponse.json(
          { error: `Asset upsert failed: ${assetError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          statementId,
          statementType,
          investmentSummary: {
            institution: investmentData.institution,
            total_value: investmentData.total_value,
            ytd_contributions: investmentData.ytd_contributions,
            ytd_withdrawals: investmentData.ytd_withdrawals,
            ytd_gains: investmentData.ytd_gains,
            holdings_count: investmentData.holdings?.length ?? 0,
          },
          status: "complete",
        },
        { status: 200 }
      );
    } catch (investmentError) {
      return NextResponse.json(
        {
          error: `Investment statement parsing failed: ${
            investmentError instanceof Error
              ? investmentError.message
              : String(investmentError)
          }`,
        },
        { status: 500 }
      );
    }
  }

  // --- Bank / credit card statement flow (existing logic) ---

  // Upload PDF to Supabase Storage (bypasses RLS via admin client)
  const storagePath = `${user.id}/${statementId}.pdf`;
  const { error: storageError } = await supabaseAdmin.storage
    .from("statements")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (storageError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${storageError.message}` },
      { status: 500 }
    );
  }

  // Insert the statement record as 'processing'
  const { error: insertError } = await supabaseAdmin
    .from("statements")
    .insert({
      id: statementId,
      user_id: user.id,
      institution: institution_resolved,
      account_type: account_type_resolved,
      statement_month: statement_month,
      status: "processing",
    });

  if (insertError) {
    return NextResponse.json(
      { error: `DB insert failed: ${insertError.message}` },
      { status: 500 }
    );
  }

  // Inline extraction — avoids self-fetch issues in Next.js App Router
  let transactionCount = 0;
  try {
    const textForParse = cachedText ?? await extractTextFromPdf(buffer);
    const format = detectFormat(textForParse);
    const transactions = await parseTransactionsWithClaude(
      textForParse,
      format,
      account_type_resolved
    );

    transactionCount = transactions.length;

    // Derive statement_month from the latest extracted transaction date.
    // Falls back to the current-month placeholder if no transactions extracted.
    let derivedStatementMonth = statement_month;
    if (transactions.length > 0) {
      const maxDate = transactions.reduce(
        (max, t) => (t.date > max ? t.date : max),
        transactions[0].date
      );
      derivedStatementMonth = maxDate.substring(0, 7) + "-01";
    }

    if (transactions.length > 0) {
      const rows = transactions.map((t) => {
        const cleanName = canonicalMerchant(t.merchant_clean) ?? t.merchant_clean;
        const classification = classifyTransaction(cleanName, t.amount, t.merchant_raw);

        return {
          statement_id: statementId,
          user_id: user.id,
          date: t.date,
          merchant_raw: t.merchant_raw,
          merchant_clean: classification.canonical_name || cleanName,
          category: classification.category_override ?? t.category,
          amount: t.amount,
          account_type: t.account_type,
          transaction_type: t.transaction_type,
          is_recurring: false,
          transfer_type: classification.transfer_type,
          transfer_confidence: classification.confidence,
          exclude_from_spending: classification.exclude_from_spending,
          business_expense: classification.business_expense,
          business_confirmed: false,
        };
      });

      const { error: txInsertError } = await supabaseAdmin
        .from("transactions")
        .insert(rows);

      if (txInsertError) {
        throw new Error(`Transaction insert failed: ${txInsertError.message}`);
      }
    }

    // Mark statement as complete
    const { error: completeError } = await supabaseAdmin
      .from("statements")
      .update({ status: "complete", statement_month: derivedStatementMonth })
      .eq("id", statementId);

    if (completeError) {
      console.error("Failed to mark statement complete:", completeError.message);
    }

    // Detect and mark recurring merchants for this user.
    // A merchant is recurring if it appears in >=2 distinct calendar months.
    const { data: allTxRows } = await supabaseAdmin
      .from("transactions")
      .select("id, merchant_clean, date")
      .eq("user_id", user.id)
      .not("merchant_clean", "is", null);

    if (allTxRows && allTxRows.length > 0) {
      // Group by merchant_clean, collect distinct months (YYYY-MM)
      const merchantMonths = new Map<string, Set<string>>();
      for (const tx of allTxRows) {
        const month = (tx.date as string).substring(0, 7);
        if (!merchantMonths.has(tx.merchant_clean)) {
          merchantMonths.set(tx.merchant_clean, new Set());
        }
        merchantMonths.get(tx.merchant_clean)!.add(month);
      }

      // Find merchants appearing in >=2 distinct months
      const recurringMerchants = [...merchantMonths.entries()]
        .filter(([, months]) => months.size >= 2)
        .map(([merchant]) => merchant);

      if (recurringMerchants.length > 0) {
        // Mark all transactions for these merchants as recurring
        await supabaseAdmin
          .from("transactions")
          .update({ is_recurring: true })
          .eq("user_id", user.id)
          .in("merchant_clean", recurringMerchants);
      }
    }
  } catch (extractionError) {
    // Mark statement as error and surface a 500
    await supabaseAdmin
      .from("statements")
      .update({ status: "error" })
      .eq("id", statementId);

    return NextResponse.json(
      {
        error: `Extraction failed: ${
          extractionError instanceof Error
            ? extractionError.message
            : String(extractionError)
        }`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      statementId,
      transactionCount,
      status: "complete",
    },
    { status: 200 }
  );
}
