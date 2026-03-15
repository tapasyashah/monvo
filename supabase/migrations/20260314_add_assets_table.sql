-- P2-D: Net Worth Panel — user_assets table for tracking investment accounts
-- and other assets outside the transactions table.

CREATE TABLE IF NOT EXISTS user_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT CHECK (asset_type IN (
    'investment_account', 'savings', 'property', 'other'
  )),
  institution TEXT,
  account_label TEXT,
  current_value NUMERIC DEFAULT 0,
  last_updated DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own assets"
  ON user_assets FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_assets_user_id ON user_assets(user_id);
