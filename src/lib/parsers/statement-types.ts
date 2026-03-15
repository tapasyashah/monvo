export type StatementType =
  | "cibc_bank"
  | "cibc_credit"
  | "wealthsimple_annual"
  | "primerica_annual"
  | "unknown";

export interface InvestmentHolding {
  name: string;
  value: number;
  units?: number;
}

export interface InvestmentStatementData {
  institution: string;
  statement_type: StatementType;
  period_start: string;
  period_end: string;
  total_value: number;
  ytd_contributions: number;
  ytd_withdrawals: number;
  ytd_gains: number;
  tfsa_room_used?: number;
  holdings?: InvestmentHolding[];
}

/**
 * Detect the type of statement from extracted PDF text.
 * Order matters: more specific checks (e.g. "CIBC" + "credit") come before
 * broader ones (e.g. just "CIBC").
 */
export function detectStatementType(pdfText: string): StatementType {
  const upper = pdfText.toUpperCase();

  if (upper.includes("WEALTHSIMPLE")) {
    return "wealthsimple_annual";
  }

  if (upper.includes("PRIMERICA")) {
    return "primerica_annual";
  }

  if (upper.includes("CIBC") && upper.includes("CREDIT")) {
    return "cibc_credit";
  }

  if (upper.includes("CIBC")) {
    return "cibc_bank";
  }

  return "unknown";
}

/** Returns true for statement types that represent investment/annual statements. */
export function isInvestmentStatement(type: StatementType): boolean {
  return type === "wealthsimple_annual" || type === "primerica_annual";
}
