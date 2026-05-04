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
  created_at      timestamptz default now()
);

-- If the table already exists, add the two new columns (safe to re-run)
alter table print3d_quotes
  add column if not exists file_name      text,
  add column if not exists drive_file_url text;

-- Allow the anon role to insert quotes (public form submissions)
alter table print3d_quotes enable row level security;

create policy if not exists "Anyone can submit a quote"
  on print3d_quotes for insert
  with check (true);

-- Only authenticated users (admin) can read quotes
create policy if not exists "Admin can read quotes"
  on print3d_quotes for select
  using (auth.role() = 'authenticated');
