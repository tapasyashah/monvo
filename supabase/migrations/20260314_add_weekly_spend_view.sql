CREATE OR REPLACE VIEW weekly_spend_summary AS
SELECT
  DATE_TRUNC('week', date) AS week_start,
  expense_context,
  category,
  SUM(ABS(amount)) AS total_spent,
  COUNT(*) AS transaction_count
FROM transactions
WHERE amount < 0
  AND (exclude_from_spending IS NULL OR exclude_from_spending = FALSE)
GROUP BY DATE_TRUNC('week', date), expense_context, category
ORDER BY week_start DESC;
