/**
 * Classifies transactions that look like internal transfers (e.g. moving money
 * between own chequing and savings) so analytics can exclude them from spending.
 */

export interface TransferRow {
  date: string;
  amount: number;
  merchant_clean: string | null;
  category: string | null;
  account_type: string | null;
}

const TRANSFER_MERCHANT_PATTERN = /online transfer|e-transfer|internet transfer|e transfer/i;
const TRANSFER_CATEGORY = "Transfers";

/** Amount tolerance for pairing (outflow vs inflow) in dollars */
const AMOUNT_TOLERANCE = 0.02;
/** Max days apart to consider a pair as same transfer */
const MAX_DAYS_APART = 2;

function isTransferLike(row: TransferRow): boolean {
  const cat = row.category ?? "";
  const merchant = row.merchant_clean ?? "";
  return (
    cat === TRANSFER_CATEGORY ||
    TRANSFER_MERCHANT_PATTERN.test(merchant) ||
    TRANSFER_MERCHANT_PATTERN.test(cat)
  );
}

/**
 * Returns the set of row indices that are part of an internal transfer pair.
 * Only runs when the user has both chequing and savings (or multiple deposit accounts).
 */
export function getInternalTransferIndices(rows: TransferRow[]): Set<number> {
  const indices = new Set<number>();
  if (rows.length === 0) return indices;

  const accountTypes = new Set(
    rows.map((r) => r.account_type).filter((t): t is string => t != null)
  );
  const hasChequing = accountTypes.has("chequing");
  const hasSavings = accountTypes.has("savings");
  if (!hasChequing || !hasSavings) return indices;

  const outflows: { index: number; date: string; amount: number }[] = [];
  const inflows: { index: number; date: string; amount: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!isTransferLike(row)) continue;
    const date = row.date.slice(0, 10);
    if (row.amount < 0) {
      outflows.push({ index: i, date, amount: Math.abs(row.amount) });
    } else if (row.amount > 0) {
      inflows.push({ index: i, date, amount: row.amount });
    }
  }

  const usedInflow = new Set<number>();
  for (const out of outflows) {
    for (let j = 0; j < inflows.length; j++) {
      if (usedInflow.has(j)) continue;
      const inRow = inflows[j];
      const amountMatch = Math.abs(out.amount - inRow.amount) <= AMOUNT_TOLERANCE;
      if (!amountMatch) continue;
      const outDate = new Date(out.date);
      const inDate = new Date(inRow.date);
      const daysDiff = Math.abs(
        (outDate.getTime() - inDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysDiff <= MAX_DAYS_APART) {
        indices.add(out.index);
        indices.add(inRow.index);
        usedInflow.add(j);
        break;
      }
    }
  }

  return indices;
}

/**
 * Filter rows to only those that count as "spending" (exclude internal transfers).
 */
export function filterToSpendingRows<T extends TransferRow>(
  rows: T[],
  internalIndices: Set<number>
): T[] {
  return rows.filter((_, i) => !internalIndices.has(i));
}
