-- Add recurring_overrides to user_profiles for user-controlled recurring subscription flags.
-- Keys: canonical merchant name. Value: true = force recurring, false = not recurring.
alter table public.user_profiles
  add column if not exists recurring_overrides jsonb not null default '{}';

comment on column public.user_profiles.recurring_overrides is
  'User overrides for recurring detection: { "Merchant Name": true|false }. true = show as recurring, false = hide from recurring.';
