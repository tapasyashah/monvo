-- P0-A: Add transfer classification columns to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transfer_type TEXT
    CHECK (transfer_type IN (
      'rent','cc_payment','investment_contribution','interac_out','interac_in',
      'internal_move','income','unknown_transfer','not_a_transfer'
    )),
  ADD COLUMN IF NOT EXISTS transfer_confidence NUMERIC(3,2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS exclude_from_spending BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS business_expense BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS business_confirmed BOOLEAN DEFAULT FALSE;
