-- P1-C: Add columns for persisted merchant normalization.
-- merchant_canonical stores the output of normalizeMerchant().canonical_name
-- merchant_category_normalized stores the category from the normalization rule.
-- Both are populated at upload time; existing rows can be backfilled later.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS merchant_canonical TEXT,
  ADD COLUMN IF NOT EXISTS merchant_category_normalized TEXT;
