-- ================================================================
-- Schema V6 — print3d_quotes table + Drive upload columns
-- Run this in: Supabase → SQL Editor → New query
-- ================================================================

-- Create the print3d_quotes table if it doesn't already exist
create table if not exists print3d_quotes (
  id              text primary key,
  name            text not null,
  contact_info    text not null,
  notes           text,
  status          text default 'new',
  file_name       text,
  drive_file_url  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- If the table already exists, add columns (safe to re-run)
alter table print3d_quotes
  add column if not exists file_name      text,
  add column if not exists drive_file_url text,
  add column if not exists updated_at     timestamptz default now();

-- Auto-update updated_at on every row change
drop trigger if exists set_print3d_quotes_updated_at on print3d_quotes;
create trigger set_print3d_quotes_updated_at
  before update on print3d_quotes
  for each row execute function set_updated_at();

-- Allow the anon role to insert quotes (public form submissions)
alter table print3d_quotes enable row level security;

do $$ begin
  create policy "Anyone can submit a quote"
    on print3d_quotes for insert with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Admin can read quotes"
    on print3d_quotes for select using (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;
