import type { InvestmentStatementData, InvestmentHolding } from "./statement-types";

/**
 * Parse a Primerica annual statement from extracted PDF text.
 *
 * TODO: Primerica statement layouts can differ between mutual fund statements,
 * segregated fund statements, and insurance investment statements. The regex
 * patterns below target the most common mutual fund annual statement format.
 *
 * TODO: Primerica often includes multiple accounts (e.g. TFSA + non-registered)
 * in a single PDF. This parser aggregates across accounts. Consider splitting
 * per-account if the product needs that granularity.
 */
export function parsePrimericaStatement(
  pdfText: string
): InvestmentStatementData {
  const institution = "Primerica";
  const statement_type = "primerica_annual" as const;

  // --- Period ---
  // Look for patterns like "For the period January 1, 2024 to December 31, 2024"
  // or "Statement period: Jan 1 - Dec 31, 2024"
  const periodMatch = pdfText.match(
    /(?:for\s+the\s+period|statement\s+period)[:\s]*(\w+ \d{1,2},?\s*\d{4})\s*(?:to|–|-)\s*(\w+ \d{1,2},?\s*\d{4})/i
  );
  let period_start = "";
  let period_end = "";

  if (periodMatch) {
    period_start = normalizeDate(periodMatch[1]);
    period_end = normalizeDate(periodMatch[2]);
  } else {
    // Fallback: look for year like "Annual Statement 2024"
    const yearMatch = pdfText.match(
      /(?:annual\s+statement|year[- ]end\s+(?:statement|report))\s*(\d{4})/i
    );
    if (yearMatch) {
      const year = yearMatch[1];
      period_start = `${year}-01-01`;
      period_end = `${year}-12-31`;
    }
  }

  // --- Total value ---
  // TODO: Primerica may label this as "Total market value", "Total value of accounts",
  // or "Closing market value"
  const totalValueMatch = pdfText.match(
    /(?:total\s+(?:market\s+)?value|closing\s+(?:market\s+)?value|total\s+value\s+of\s+accounts?)[:\s]*\$?([\d,]+\.?\d*)/i
  );
  const total_value = totalValueMatch
    ? parseAmount(totalValueMatch[1])
    : 0;

  // --- Contributions ---
  // TODO: May appear as "Contributions", "Purchases", "Total deposits"
  const contribMatch = pdfText.match(
    /(?:total\s+contributions?|total\s+purchases?|total\s+deposits?|contributions?\s+(?:this\s+year|during\s+the\s+period))[:\s]*\$?([\d,]+\.?\d*)/i
  );
  const ytd_contributions = contribMatch
    ? parseAmount(contribMatch[1])
    : 0;

  // --- Withdrawals / Redemptions ---
  // TODO: Primerica may use "Redemptions" instead of "Withdrawals"
  const withdrawMatch = pdfText.match(
    /(?:total\s+(?:withdrawals?|redemptions?)|redemptions?\s+during\s+the\s+period)[:\s]*\$?([\d,]+\.?\d*)/i
  );
  const ytd_withdrawals = withdrawMatch
    ? parseAmount(withdrawMatch[1])
    : 0;

  // --- Gains ---
  // TODO: Often labelled "Change in market value" or "Investment income"
  const gainsMatch = pdfText.match(
    /(?:change\s+in\s+(?:market\s+)?value|investment\s+(?:income|returns?|gains?)|net\s+(?:earnings?|gains?))[:\s]*\$?([\d,.-]+)/i
  );
  const ytd_gains = gainsMatch ? parseAmount(gainsMatch[1]) : 0;

  // --- Holdings ---
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
    holdings: holdings.length > 0 ? holdings : undefined,
  };
}

/** Parse "$1,234.56" or "1234.56" into a number. Handles negative values. */
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
 * Extract fund holdings from Primerica statement text.
 *
 * TODO: Primerica statements typically list funds in a table like:
 *   "AGF Canadian Growth Fund   1,234.567   $15,678.90"
 * The column order and formatting vary by statement year.
 */
function extractHoldings(pdfText: string): InvestmentHolding[] {
  const holdings: InvestmentHolding[] = [];

  // Match lines: fund name, optional units, dollar value
  // Pattern: "Fund Name   1,234.567   $15,678.90"
  const holdingPattern =
    /^(.{3,60}?)\s+([\d,]+\.\d{2,4})\s+\$?([\d,]+\.\d{2})$/gim;

  let match: RegExpExecArray | null;
  while ((match = holdingPattern.exec(pdfText)) !== null) {
    const name = match[1].trim();
    const units = parseAmount(match[2]);
    const value = parseAmount(match[3]);

    // Skip header/summary rows
    if (
      name.toLowerCase().includes("total") ||
      name.toLowerCase().includes("fund name") ||
      name.toLowerCase().includes("description")
    ) {
      continue;
    }

    holdings.push({ name, value, units });
  }

  // Fallback: try "Fund Name   $15,678.90" (no units column)
  if (holdings.length === 0) {
    const simplePattern = /^(.{3,60}?)\s+\$?([\d,]+\.\d{2})\s*$/gim;
    let simpleMatch: RegExpExecArray | null;
    while ((simpleMatch = simplePattern.exec(pdfText)) !== null) {
      const name = simpleMatch[1].trim();
      const value = parseAmount(simpleMatch[2]);

      if (
        name.toLowerCase().includes("total") ||
        name.toLowerCase().includes("fund name") ||
        name.toLowerCase().includes("description") ||
        name.toLowerCase().includes("account")
      ) {
        continue;
      }

      holdings.push({ name, value });
    }
  }

  return holdings;
}
