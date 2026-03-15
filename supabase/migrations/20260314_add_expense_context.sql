-- P0-B: Business vs. personal expense separation
-- Adds expense context columns to transactions table

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS expense_context TEXT
    CHECK (expense_context IN (
      'personal','business_bare_thoughts','business_finnav','business_factory','business_other','investment','transfer'
    )) DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS expense_context_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expense_context_note TEXT;

-- Index for filtering by expense context
CREATE INDEX IF NOT EXISTS idx_transactions_expense_context
  ON transactions (expense_context);
