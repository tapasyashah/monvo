-- Cash flow summary function
-- Returns monthly income, spending, business spending, investment contributions,
-- and savings metrics for the given user, filtered by spending view.

CREATE OR REPLACE FUNCTION get_cash_flow_summary(
  p_user_id UUID,
  p_months INT DEFAULT 3,
  p_view TEXT DEFAULT 'personal_only'
) RETURNS TABLE (
  month DATE,
  total_income NUMERIC,
  true_spending NUMERIC,
  business_spending NUMERIC,
  investment_contributions NUMERIC,
  transfer_total NUMERIC,
  surplus_deficit NUMERIC,
  savings_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT date_trunc('month', CURRENT_DATE - ((p_months - 1) || ' months')::INTERVAL)::DATE AS start_date
  ),
  monthly AS (
    SELECT
      date_trunc('month', t.date)::DATE AS month,

      -- Income: positive amounts excluding transfers / CC payments
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.amount > 0
          AND COALESCE(t.category, '') NOT IN ('Transfers', 'Credit Card Payment', 'Transfer', 'CC Payment')
      ), 0) AS total_income,

      -- True spending: negative amounts, not excluded, filtered by view
      COALESCE(SUM(ABS(t.amount)) FILTER (
        WHERE t.amount < 0
          AND COALESCE(t.exclude_from_spending, FALSE) = FALSE
          AND (
            CASE p_view
              WHEN 'personal_only' THEN COALESCE(t.expense_context, 'personal') = 'personal'
              WHEN 'true_personal' THEN COALESCE(t.expense_context, 'personal') = 'personal'
              WHEN 'business_only' THEN COALESCE(t.expense_context, 'personal') LIKE 'business_%'
              WHEN 'all'           THEN TRUE
              ELSE COALESCE(t.expense_context, 'personal') = 'personal'
            END
          )
      ), 0) AS true_spending,

      -- Business spending (always computed regardless of view)
      COALESCE(SUM(ABS(t.amount)) FILTER (
        WHERE t.amount < 0
          AND COALESCE(t.expense_context, 'personal') LIKE 'business_%'
      ), 0) AS business_spending,

      -- Investment contributions
      COALESCE(SUM(ABS(t.amount)) FILTER (
        WHERE COALESCE(t.transfer_type, '') = 'investment_contribution'
      ), 0) AS investment_contributions,

      -- All transfers
      COALESCE(SUM(ABS(t.amount)) FILTER (
        WHERE COALESCE(t.exclude_from_spending, FALSE) = TRUE
      ), 0) AS transfer_total

    FROM transactions t, date_range d
    WHERE t.user_id = p_user_id
      AND t.date >= d.start_date
      AND t.date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE
    GROUP BY date_trunc('month', t.date)::DATE
  )
  SELECT
    m.month,
    m.total_income,
    m.true_spending,
    m.business_spending,
    m.investment_contributions,
    m.transfer_total,
    m.total_income - m.true_spending AS surplus_deficit,
    CASE
      WHEN m.total_income > 0
        THEN ROUND(((m.total_income - m.true_spending) / m.total_income) * 100, 1)
      ELSE 0
    END AS savings_rate
  FROM monthly m
  ORDER BY m.month;
END;
$$ LANGUAGE plpgsql STABLE;
