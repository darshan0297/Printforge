-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V3.sql
-- ADDITIVE: safe to run on top of V1 + V2
-- Adds: laser_quotes table, laser-quotes storage bucket
-- ================================================================

-- ── LASER QUOTES table ────────────────────────────────────────
create table if not exists laser_quotes (
  id           text primary key,                  -- LQ-timestamp
  name         text not null,
  email        text not null,
  phone        text,
  material     text not null,
  colour       text,
  operation    text not null,
  quantity     integer not null default 1,
  width_cm     numeric(8,2),
  height_cm    numeric(8,2),
  notes        text,
  file_urls    text[],                            -- uploaded design files
  status       text not null default 'new',       -- new|quoted|accepted|declined|completed
  quoted_price numeric(10,2),                     -- filled in by admin after review
  admin_notes  text,                              -- internal notes
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Auto-update updated_at
drop trigger if exists set_laser_quotes_updated_at on laser_quotes;
create trigger set_laser_quotes_updated_at
  before update on laser_quotes
  for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table laser_quotes enable row level security;

-- Anyone can submit a quote
create policy "Public can insert laser quotes"
  on laser_quotes for insert
  with check (true);

-- Admin can read all
create policy "Admin read laser quotes"
  on laser_quotes for select
  using (auth.role() = 'authenticated');

-- Admin can update status
create policy "Admin update laser quotes"
  on laser_quotes for update
  using (auth.role() = 'authenticated');

-- ── STORAGE: laser-quotes bucket ─────────────────────────────
-- Stores customer-uploaded design files (SVG, DXF, PDF, etc.)
insert into storage.buckets (id, name, public)
values ('laser-quotes', 'laser-quotes', false)   -- private: only admin can read
on conflict (id) do nothing;

-- Anyone can upload to laser-quotes (they're uploading their own files)
create policy "Public upload laser quote files"
  on storage.objects for insert
  with check (bucket_id = 'laser-quotes');

-- Only authenticated (admin) can view uploaded files
create policy "Admin read laser quote files"
  on storage.objects for select
  using (
    bucket_id = 'laser-quotes'
    and auth.role() = 'authenticated'
  );

-- ── ADD laser products to existing products table ─────────────
insert into products (name, category, description, price, old_price, stock, icon, tag, featured, specs) values
('Acrylic Name Sign', 'Laser Cutting', 'Custom cut acrylic name or word sign in your choice of colour. 3mm cast acrylic, clean laser-cut edges. Perfect for desks, shelves, and gifting.', 1800, 2400, 99, '✨', 'Popular', true, '{"material":"3mm Cast Acrylic","size":"Up to 20×10cm","finish":"Polished edges","colours":"Clear, Black, White, Red, Blue, Green, Gold, Pink"}'),
('Wooden Coaster Set (4pc)', 'Laser Cutting', 'Set of 4 laser-engraved MDF coasters with custom design or text. 90mm diameter, 6mm thick. Sealed with matte lacquer.', 2200, null, 30, '🪵', 'In Stock', true, '{"material":"6mm MDF","size":"90mm diameter","quantity":"4 coasters","finish":"Matte lacquer sealed"}'),
('Acrylic Keychain', 'Laser Cutting', 'Custom shape or text acrylic keychain. Choose your colour, we cut and engrave it. Great for events, gifts, and branding.', 450, null, 99, '🔑', 'In Stock', false, '{"material":"3mm Cast Acrylic","size":"Up to 6×4cm","hardware":"Metal split ring included"}'),
('Engraved Plaque — Acrylic', 'Laser Cutting', 'Professional engraved acrylic plaque for awards, recognition, or office use. High-contrast laser engraving with standoff mounting hardware.', 3500, 4200, 15, '🏆', 'Deal', false, '{"material":"5mm Gloss Acrylic","size":"A5 (148×210mm)","mounting":"4× chrome standoffs included"}'),
('Fabric Patch — Custom Shape', 'Laser Cutting', 'Laser-cut felt or canvas patch in any shape. Clean sealed edges, no fraying. Ideal for cosplay, bags, and jackets.', 650, null, 50, '🧩', 'In Stock', false, '{"materials":"Felt, Canvas, Denim","size":"Up to 10×10cm","edges":"Heat-sealed, no fray"}'),
('Leather Luggage Tag', 'Laser Cutting', 'Laser-engraved genuine leather luggage tag with your name or custom text. 3–4mm vegetable-tanned leather, brass eyelet and loop included.', 1200, null, 20, '🏷️', 'In Stock', false, '{"material":"3–4mm Veg-tanned leather","size":"10×5cm","hardware":"Brass eyelet + strap loop"}')
on conflict do nothing;
