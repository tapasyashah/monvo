import pdfParse from 'pdf-parse';
import Anthropic from '@anthropic-ai/sdk';

export interface ParsedTransaction {
  date: string;            // ISO date "YYYY-MM-DD"
  merchant_raw: string;    // verbatim from PDF
  merchant_clean: string;  // human-readable normalized name
  amount: number;          // negative = outflow, positive = inflow
  category: string | null; // from CIBC Visa Spend Categories column, else null
  account_type: 'chequing' | 'savings' | 'credit_card';
  transaction_type: 'debit' | 'credit' | 'refund';
}

export type PdfFormat = 'cibc_bank' | 'cibc_visa' | 'amex';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export function detectFormat(text: string): PdfFormat {
  if (text.includes('Withdrawals') && text.includes('Deposits')) {
    return 'cibc_bank';
  }
  if (text.includes('Spend Categories') || text.includes('CIBC Dividend')) {
    return 'cibc_visa';
  }
  if (
    text.includes('American Express') ||
    text.includes('Amex') ||
    text.includes('COBALT')
  ) {
    return 'amex';
  }
  return 'cibc_bank';
}

export function resolveInstitutionAndType(
  format: PdfFormat,
  text: string
): { institution: string; account_type: 'chequing' | 'savings' | 'credit_card' } {
  switch (format) {
    case 'cibc_bank': {
      const isSavings =
        text.includes('SAVINGS') ||
        text.includes('eSavings') ||
        text.includes('High Interest Savings');
      return { institution: 'CIBC', account_type: isSavings ? 'savings' : 'chequing' };
    }
    case 'cibc_visa':
      return { institution: 'CIBC', account_type: 'credit_card' };
    case 'amex':
      return { institution: 'American Express', account_type: 'credit_card' };
  }
}

const SYSTEM_PROMPT = `You are a financial data extraction assistant. Extract all transactions from the bank statement text and return them as a JSON array.

CRITICAL: Return ONLY a raw JSON array. No markdown, no code fences, no explanation. Your entire response must start with [ and end with ].

Each transaction object must have EXACTLY these fields:
{
  "date": "YYYY-MM-DD",
  "merchant_raw": "verbatim merchant name from PDF",
  "merchant_clean": "Readable Merchant Name",
  "amount": -12.34,
  "category": null,
  "account_type": "chequing",
  "transaction_type": "debit"
}

Rules:
1. Amounts: negative = money out (withdrawals, purchases, fees), positive = money in (deposits, payments, refunds)
2. For CIBC bank accounts (chequing/savings): Withdrawals column = negative amount, Deposits column = positive amount
3. For credit cards: purchases are positive in the PDF but store as NEGATIVE (money out). Payments to the card are negative in the PDF but store as POSITIVE (money in)
4. Skip balance rows, opening/closing balance lines, summary totals
5. Skip foreign currency conversion lines (lines showing exchange rates like "UNITED STATES DOLLAR 22.60 1.41416") — only keep the CAD transaction line
6. Skip "MEMBERSHIP FEE" entries in "Other Account Transactions" section for Amex
7. For 2-line merchant descriptions (CIBC bank accounts), join both lines as the merchant_raw
8. Normalize all dates to ISO format YYYY-MM-DD. Year: if statement shows Oct 2023 use 2023, if Jan/Feb 2026 use 2026
9. The "category" field:
    - For CIBC Visa statements: use the Spend Category string verbatim (e.g., "Restaurants", "Personal/Household")
    - For ALL other statement types (chequing, savings, Amex): infer the best-fit category from the merchant name using ONLY these categories:
      Restaurants, Groceries, Transportation, Travel, Entertainment, Shopping, Health, Utilities & Bills, Transfers, Banking & Fees, Other
    - Transfers/e-transfers/online banking → "Transfers"
    - Service charges, bank fees, NSF → "Banking & Fees"
    - Never return null for category — always assign one of the above
10. The "merchant_clean" field: create a human-readable name from merchant_raw by:
    - Stripping numeric transaction IDs (long digit strings like "010829889685")
    - Title casing the result
    - E-TRANSFER patterns → "E-Transfer (Name)" where Name is the recipient/sender name if present
    - "INTERNET TRANSFER ..." or "ONLINE BANKING TRANSFER" → "Online Transfer"
    - "SERVICE CHARGE ADD" or "SERVICE CHARGE DISC" → "Service Charge"
    - "RETAIL PURCHASE ..." → "Retail Purchase"
    - "PAY [Company]" → strip "PAY " prefix, use company name
    - "PREAUTHORIZED DEBIT" → "Pre-authorized Debit"
    - If none of the above patterns match, just title-case the merchant_raw and strip trailing numbers/codes
11. The "account_type" field must be exactly the value passed in the context below
12. The "transaction_type" field:
    - "refund": positive amounts with keywords REFUND, REVERSAL, CHARGEBACK, CREDIT ADJ, ADJUSTMENT CR, RETURN, CREDIT MEMO in merchant_raw
    - "credit": other positive amounts (deposits, income, e-transfers received, card payments)
    - "debit": negative amounts (purchases, fees, withdrawals)`;

function isValidTransaction(t: unknown): t is ParsedTransaction {
  if (typeof t !== 'object' || t === null) return false;
  const obj = t as Record<string, unknown>;
  return (
    typeof obj.date === 'string' &&
    typeof obj.merchant_raw === 'string' &&
    typeof obj.merchant_clean === 'string' &&
    typeof obj.amount === 'number' &&
    (obj.category === null || typeof obj.category === 'string') &&
    (obj.account_type === 'chequing' ||
      obj.account_type === 'savings' ||
      obj.account_type === 'credit_card') &&
    (obj.transaction_type === 'debit' ||
      obj.transaction_type === 'credit' ||
      obj.transaction_type === 'refund')
  );
}

export async function parseTransactionsWithClaude(
  text: string,
  format: PdfFormat,
  accountType: 'chequing' | 'savings' | 'credit_card'
): Promise<ParsedTransaction[]> {
  if (text.trim().length === 0) {
    throw new Error('PDF contains no extractable text. Scanned or image-only PDFs are not supported.');
  }

  const client = new Anthropic();

  const userMessage = `Statement format: ${format}
Account type: ${accountType}

Statement text:
${text}`;

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });
  } catch (err) {
    throw new Error(
      `Claude API call failed for format "${format}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (message.stop_reason === 'max_tokens') {
    throw new Error('Claude response was truncated. Statement may be too large.');
  }

  const firstContent = message.content[0];
  if (firstContent.type !== 'text') {
    throw new Error('Claude returned a non-text response');
  }
  const responseText = firstContent.text;

  // Strip markdown code fences that Claude sometimes includes despite instructions
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      `Claude returned invalid JSON: ${jsonText.slice(0, 200)}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Claude returned invalid JSON: ${responseText.slice(0, 200)}`
    );
  }

  if (!parsed.every(isValidTransaction)) {
    throw new Error('Claude returned transactions with invalid shape');
  }
  return parsed;
}
