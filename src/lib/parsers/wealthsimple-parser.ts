import type { InvestmentStatementData, InvestmentHolding } from "./statement-types";

/**
 * Parse a Wealthsimple annual statement from extracted PDF text.
 *
 * TODO: Wealthsimple statement layouts vary between years. The regex patterns
 * below are based on common 2023-2025 annual statement formats. If Wealthsimple
 * redesigns their statements, these patterns will need updating.
 *
 * TODO: Multi-account statements (e.g. TFSA + RRSP in one PDF) may not parse
 * correctly — this assumes a single-account statement or returns the aggregate.
 */
export function parseWealthsimpleStatement(
  pdfText: string
): InvestmentStatementData {
  const institution = "Wealthsimple";
  const statement_type = "wealthsimple_annual" as const;

  // --- Period ---
  // Look for patterns like "January 1, 2024 to December 31, 2024"
  // or "Jan 1 – Dec 31, 2024"
  const periodMatch = pdfText.match(
    /(\w+ \d{1,2},?\s*\d{4})\s*(?:to|–|-)\s*(\w+ \d{1,2},?\s*\d{4})/i
  );
  const period_start = periodMatch ? normalizeDate(periodMatch[1]) : "";
  const period_end = periodMatch ? normalizeDate(periodMatch[2]) : "";

  // --- Total account value ---
  // TODO: Pattern assumes "$X,XXX.XX" after "Total account value" or "Account value"
  const totalValueMatch = pdfText.match(
    /(?:total\s+account\s+value|account\s+value|market\s+value)[:\s]*\$?([\d,]+\.?\d*)/i
  );
  const total_value = totalValueMatch
    ? parseAmount(totalValueMatch[1])
    : 0;

  // --- Contributions ---
  // TODO: May appear as "Contributions this year", "Net contributions", or "Deposits"
  const contribMatch = pdfText.match(
    /(?:contributions?\s+this\s+year|net\s+contributions?|total\s+deposits?)[:\s]*\$?([\d,]+\.?\d*)/i
  );
  const ytd_contributions = contribMatch
    ? parseAmount(contribMatch[1])
    : 0;

  // --- Withdrawals ---
  const withdrawMatch = pdfText.match(
    /(?:withdrawals?\s+this\s+year|total\s+withdrawals?)[:\s]*\$?([\d,]+\.?\d*)/i
  );
  const ytd_withdrawals = withdrawMatch
    ? parseAmount(withdrawMatch[1])
    : 0;

  // --- Gains / Growth ---
  // TODO: Wealthsimple sometimes labels this "Investment growth" or "Returns"
  const gainsMatch = pdfText.match(
    /(?:investment\s+growth|returns?\s+this\s+year|net\s+earnings?|total\s+(?:gains?|returns?))[:\s]*\$?([\d,.-]+)/i
  );
  const ytd_gains = gainsMatch ? parseAmount(gainsMatch[1]) : 0;

  // --- TFSA contribution room ---
  const tfsaMatch = pdfText.match(
    /(?:TFSA\s+contribution\s+room|remaining\s+TFSA\s+room)[:\s]*\$?([\d,]+\.?\d*)/i
  );
  const tfsa_room_used = tfsaMatch ? parseAmount(tfsaMatch[1]) : undefined;

  // --- Holdings ---
  // TODO: Holdings table format varies widely. This captures simple
  // "Fund Name   $X,XXX.XX" lines. May miss multi-column layouts.
  const holdings = extractHoldings(pdfText);

  return {
    institution,
    statement_type,
    period_start,
    period_end,
    total_value,
    ytd_contributions,
    ytd_withdrawals,
    ytd_gains,
    tfsa_room_used,
    holdings: holdings.length > 0 ? holdings : undefined,
  };
}

/** Parse "$1,234.56" or "1234.56" into a number. */
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalize a date string like "January 1, 2024" into "2024-01-01".
 * Returns empty string if parsing fails.
 */
function normalizeDate(raw: string): string {
  try {
    const d = new Date(raw.replace(",", "").trim());
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Extract holdings from PDF text.
 * TODO: This is a best-effort extraction. Wealthsimple statements list holdings
 * in varying table formats. The regex below captures lines like:
 *   "Wealthsimple Growth Portfolio   $12,345.67   123.456 units"
 */
function extractHoldings(pdfText: string): InvestmentHolding[] {
  const holdings: InvestmentHolding[] = [];

  // Match lines with a name, a dollar amount, and optionally units
  const holdingPattern =
    /^(.{3,60}?)\s+\$?([\d,]+\.\d{2})\s*(?:([\d,.]+)\s*units?)?$/gim;

  let match: RegExpExecArray | null;
  while ((match = holdingPattern.exec(pdfText)) !== null) {
    const name = match[1].trim();
    const value = parseAmount(match[2]);
    const units = match[3] ? parseAmount(match[3]) : undefined;

    // Skip header-like or summary lines
    if (
      name.toLowerCase().includes("total") ||
      name.toLowerCase().includes("account") ||
      name.toLowerCase().includes("date")
    ) {
      continue;
    }

    holdings.push({ name, value, units });
  }

  return holdings;
}
