-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V7.sql
-- ADDITIVE: safe to run on top of V1-V6
-- Adds: page_views table, orders.admin_comment column
-- ================================================================

-- ── PAGE VIEWS ────────────────────────────────────────────────
-- Tracks unique visitor IPs per page for admin analytics
create table if not exists public.page_views (
  id         uuid        default gen_random_uuid() primary key,
  page       text        not null,
  ip         text        not null,
  session_id text        not null,
  visited_at timestamptz default now()
);

create unique index if not exists page_views_session_page_idx
  on public.page_views (session_id, page);

alter table public.page_views enable row level security;

create policy "anon insert" on public.page_views
  for insert to anon with check (true);

create policy "anon select" on public.page_views
  for select to anon using (true);

-- ── ORDERS: admin comment ─────────────────────────────────────
-- Message from admin shown on the customer order tracking page
alter table public.orders
  add column if not exists admin_comment text;
