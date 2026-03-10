create table if not exists public.ask_monvo_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_text text not null,
  financial_snapshot jsonb not null,
  response_verdict text,
  response_impact text,
  response_path text,
  response_watchout text,
  created_at timestamptz not null default now(),
  was_helpful boolean
);

alter table public.ask_monvo_queries enable row level security;

create policy "Users can insert their own queries"
  on public.ask_monvo_queries for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own queries"
  on public.ask_monvo_queries for select
  using (auth.uid() = user_id);
