-- ================================================================
-- PrintForge — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query → Run
-- ================================================================

-- ── PRODUCTS ─────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null,
  description text,
  price       numeric(10,2) not null,
  old_price   numeric(10,2),
  stock       integer not null default 0,
  icon        text default '📦',
  images      text[],           -- array of image URLs (Supabase Storage)
  specs       jsonb,            -- { material: "PLA+", weight: "1kg", ... }
  tag         text,             -- "Deal", "In Stock", "Custom", "Popular"
  featured    boolean default false,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── ORDERS ───────────────────────────────────────────────────
create table if not exists orders (
  id                  text primary key default 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_seq')::text, 4, '0'),
  customer_email      text not null,
  customer_firstname  text,
  customer_lastname   text,
  customer_phone      text,
  customer_address    text,
  customer_notes      text,
  items               jsonb not null,    -- [{id, name, qty, price}, ...]
  subtotal            numeric(10,2),
  delivery_fee        numeric(10,2),
  total               numeric(10,2) not null,
  status              text not null default 'pending',
  payhere_order_id    text,
  payhere_payment_id  text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Sequence for readable order IDs
create sequence if not exists order_seq start 1;

-- ── CONTACTS ─────────────────────────────────────────────────
create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text,
  message    text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table products  enable row level security;
alter table orders    enable row level security;
alter table contacts  enable row level security;

-- Products: anyone can read active products
create policy "Public read active products"
  on products for select
  using (active = true);

-- Products: only authenticated users (admin) can write
create policy "Admin full access products"
  on products for all
  using (auth.role() = 'authenticated');

-- Orders: anyone can insert (place an order)
create policy "Public can insert orders"
  on orders for insert
  with check (true);

-- Orders: users can read their own orders by email
create policy "Read own orders"
  on orders for select
  using (true);  -- adjust to: using (customer_email = current_setting('app.user_email', true))

-- Orders: admin can update
create policy "Admin can update orders"
  on orders for update
  using (auth.role() = 'authenticated');

-- Contacts: anyone can insert
create policy "Public can submit contact"
  on contacts for insert
  with check (true);

-- Contacts: admin only can read
create policy "Admin read contacts"
  on contacts for select
  using (auth.role() = 'authenticated');

-- ── SEED SAMPLE PRODUCTS ──────────────────────────────────────
insert into products (name, category, description, price, old_price, stock, icon, tag, featured, specs) values
('Goku Ultra Instinct Helmet', 'Cosplay Props', 'High-detail PLA+ helmet print, primed and ready to paint. Designed for cosplay use with internal foam padding mounts. Fits most adult head sizes.', 8500, 11000, 5, '🪖', 'Popular', true, '{"material":"PLA+","layer_height":"0.15mm","infill":"25%","finish":"Primed","weight":"~380g"}'),
('PLA+ Filament 1kg', 'Filament', 'Premium 1.75mm PLA+ available in 12 colours. Tangle-free vacuum-sealed spool. ±0.02mm dimensional accuracy.', 3200, null, 50, '🧵', 'In Stock', true, '{"diameter":"1.75mm","weight":"1kg","tolerance":"±0.02mm","print_temp":"200–220°C","bed_temp":"0–60°C"}'),
('Ender 5 Upgrade Kit', 'Printer Parts', 'Drop-in replacement extruder, belt tensioner, and hardened steel nozzle set for the Ender 5 / 5 Pro.', 4800, 5500, 12, '🔩', 'Deal', true, '{"compatibility":"Ender 5 / 5 Pro","includes":"Extruder, Tensioner, 3× Nozzles","nozzle_size":"0.4mm"}'),
('PETG Filament 1kg', 'Filament', 'Tough, heat-resistant, and food-safe. Ideal for functional printed parts. Available in black, clear, and blue.', 3600, null, 30, '🎁', 'In Stock', false, '{"diameter":"1.75mm","weight":"1kg","print_temp":"230–250°C","bed_temp":"70–80°C"}'),
('TPU Flex Filament 500g', 'Filament', 'Shore 95A flexible filament. Perfect for grips, gaskets, phone cases, and vibration-dampening parts.', 2900, null, 15, '🌀', 'In Stock', false, '{"diameter":"1.75mm","shore_hardness":"95A","weight":"500g","print_temp":"210–230°C"}'),
('Post-Processing Tool Kit', 'Tools & Finishing', 'Deburring tool, needle files (5-piece), sandpaper assortment (100–2000 grit), and plastic scraper.', 1800, null, 25, '🛠️', 'Useful', false, '{"includes":"Deburring tool, 5 files, sandpaper set, scraper"}')
on conflict do nothing;

-- ================================================================
-- EDGE FUNCTION: payhere-webhook
-- Deploy via: supabase functions deploy payhere-webhook
-- ================================================================
-- Create file: supabase/functions/payhere-webhook/index.ts
--
-- import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
-- import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
-- import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"
--
-- serve(async (req) => {
--   const body = await req.formData()
--   const merchant_id   = body.get('merchant_id')
--   const order_id      = body.get('order_id')
--   const payment_id    = body.get('payhere_payment_id')
--   const status_code   = body.get('status_code')
--   const md5sig        = body.get('md5sig')
--   const amount        = body.get('payhere_amount')
--   const currency      = body.get('payhere_currency')
--
--   // Verify MD5 signature
--   const MERCHANT_SECRET = Deno.env.get('PAYHERE_MERCHANT_SECRET')!
--   const hasher = crypto.subtle
--   const secretHash = (await hasher.digest("MD5", new TextEncoder().encode(MERCHANT_SECRET))).toString().toUpperCase()
--   const localSig = md5(merchant_id + order_id + amount + currency + status_code + secretHash).toUpperCase()
--   if (localSig !== md5sig) return new Response("Invalid signature", { status: 400 })
--
--   const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
--   const status = status_code === '2' ? 'paid' : status_code === '0' ? 'pending' : 'failed'
--   await supabase.from('orders').update({ status, payhere_payment_id: payment_id, updated_at: new Date().toISOString() }).eq('id', order_id)
--
--   return new Response("OK")
-- })
