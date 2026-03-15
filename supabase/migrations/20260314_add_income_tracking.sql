-- P0-C: Income recognition columns + monthly summary view
-- Adds is_income, income_type, income_confirmed to transactions table
-- Creates monthly_income_summary view for dashboard aggregation

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_income BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS income_type TEXT
    CHECK (income_type IN (
      'employment','freelance','transfer_in','investment_return','refund','other_income'
    )),
  ADD COLUMN IF NOT EXISTS income_confirmed BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE VIEW monthly_income_summary AS
SELECT
  DATE_TRUNC('month', date) AS month,
  SUM(CASE WHEN is_income = TRUE AND income_type NOT IN ('transfer_in', 'refund') THEN amount ELSE 0 END) AS true_income,
  SUM(CASE WHEN is_income = TRUE THEN amount ELSE 0 END) AS total_inflows,
  COUNT(CASE WHEN is_income = TRUE THEN 1 END) AS income_transaction_count
FROM transactions
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;
