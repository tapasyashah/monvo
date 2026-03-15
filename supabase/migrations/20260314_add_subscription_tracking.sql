-- Subscription tracking table for user-confirmed recurring charges
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_canonical TEXT NOT NULL,
  category TEXT,
  status TEXT CHECK (status IN ('confirmed', 'unconfirmed', 'flagged', 'dismissed')) DEFAULT 'unconfirmed',
  is_actual_subscription BOOLEAN DEFAULT TRUE,
  user_label TEXT,
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  monthly_amount NUMERIC DEFAULT 0,
  annual_estimate NUMERIC DEFAULT 0,
  first_seen DATE,
  last_seen DATE,
  occurrence_count INT DEFAULT 1,
  expense_context TEXT DEFAULT 'personal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscriptions"
  ON subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Unique constraint: one subscription entry per merchant per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_merchant
  ON subscriptions(user_id, merchant_canonical);
