CREATE TABLE IF NOT EXISTS nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'alert')) DEFAULT 'info',
  data JSONB,
  seen BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own nudges" ON nudges FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_user_active ON nudges(user_id) WHERE dismissed = FALSE;
