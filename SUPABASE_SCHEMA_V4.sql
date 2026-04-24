-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V4.sql
-- ADDITIVE: safe to run on top of V1 + V2 + V3
-- Adds: discount_codes table, shop_config table
-- ================================================================

-- ── DISCOUNT CODES ────────────────────────────────────────────
create table if not exists discount_codes (
  id          text primary key default gen_random_uuid()::text,
  code        text not null unique,            -- e.g. LAUNCH20
  type        text not null default 'percent', -- 'percent' | 'fixed'
  value       numeric(10,2) not null,          -- % or LKR amount
  min_order   numeric(10,2) default 0,         -- minimum cart total to apply
  max_uses    integer,                         -- null = unlimited
  uses        integer not null default 0,      -- usage counter
  expires_at  timestamptz,                     -- null = no expiry
  active      boolean default true,
  created_at  timestamptz default now()
);

alter table discount_codes enable row level security;

-- Anyone can validate a coupon code (needed at checkout)
create policy "Public can read active coupons"
  on discount_codes for select
  using (active = true);

-- Only admin can create/update/delete
create policy "Admin manage coupons"
  on discount_codes for all
  using (auth.role() = 'authenticated');

-- ── VALIDATE & APPLY COUPON (call from checkout) ──────────────
-- Returns: { valid, discount_amount, message }
-- Pass: code TEXT, cart_total NUMERIC

create or replace function validate_coupon(
  p_code      text,
  p_total     numeric
) returns jsonb
language plpgsql security definer as $$
declare
  c record;
  discount numeric;
begin
  select * into c from discount_codes
  where upper(code) = upper(p_code) and active = true;

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Invalid discount code', 'discount_amount', 0);
  end if;

  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('valid', false, 'message', 'This code has expired', 'discount_amount', 0);
  end if;

  if c.max_uses is not null and c.uses >= c.max_uses then
    return jsonb_build_object('valid', false, 'message', 'This code has reached its usage limit', 'discount_amount', 0);
  end if;

  if p_total < c.min_order then
    return jsonb_build_object(
      'valid', false,
      'message', 'Minimum order of LKR ' || round(c.min_order) || ' required for this code',
      'discount_amount', 0
    );
  end if;

  -- Calculate discount
  if c.type = 'percent' then
    discount := round(p_total * c.value / 100, 2);
  else
    discount := least(c.value, p_total); -- can't discount more than total
  end if;

  return jsonb_build_object(
    'valid', true,
    'message', c.type || ':' || c.value,
    'discount_amount', discount,
    'code_id', c.id,
    'code', c.code,
    'type', c.type,
    'value', c.value
  );
end;
$$;

-- ── INCREMENT COUPON USAGE (call after successful payment) ─────
create or replace function increment_coupon_usage(p_code text)
returns void language plpgsql security definer as $$
begin
  update discount_codes set uses = uses + 1 where upper(code) = upper(p_code);
end;
$$;

-- ── SHOP CONFIG ───────────────────────────────────────────────
-- Key-value store for live-editable shop settings
create table if not exists shop_config (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

alter table shop_config enable row level security;

-- Public can read config (needed on storefront pages)
create policy "Public read shop config"
  on shop_config for select
  using (true);

-- Only admin can write
create policy "Admin write shop config"
  on shop_config for all
  using (auth.role() = 'authenticated');

-- Seed default config
insert into shop_config (key, value) values
  ('shop_name',           'PrintForge'),
  ('shop_email',          'hello@printforge.lk'),
  ('shop_phone',          '+94 77 000 0000'),
  ('shop_address',        'Mount Lavinia, Sri Lanka'),
  ('delivery_fee',        '350'),
  ('free_threshold',      '10000'),
  ('delivery_note',       'Island-wide delivery within 2–3 business days'),
  ('payhere_merchant_id', ''),
  ('payhere_sandbox',     'true'),
  ('banner_text',         ''),
  ('banner_color',        'accent')
on conflict (key) do nothing;

-- ── ADD discount columns to orders ───────────────────────────
alter table orders add column if not exists discount_amount numeric(10,2) default 0;
alter table orders add column if not exists discount_code   text;

-- ── Additional shop_config keys for pricing (V4 addendum) ────
insert into shop_config (key, value) values
  ('laser_setup_fee',   '300'),
  ('laser_bulk_qty',    '10'),
  ('laser_bulk_pct',    '10'),
  ('laser_range_mult',  '1.6'),
  ('laser_size_mult',   '{"xs":0.6,"sm":1,"md":2.2,"lg":5,"xl":12}'),
  ('laser_op_mult',     '{"cut":1,"engrave":0.9,"cut-engrave":1.6,"raster":2.2}'),
  ('laser_mat_rates',   '[{"key":"acrylic-2","label":"Acrylic 2mm","rate":220},{"key":"acrylic-3","label":"Acrylic 3mm","rate":300},{"key":"acrylic-5","label":"Acrylic 5mm","rate":380},{"key":"acrylic-6","label":"Acrylic 6mm","rate":440},{"key":"acrylic-8","label":"Acrylic 8mm","rate":520},{"key":"acrylic-10","label":"Acrylic 10mm","rate":650},{"key":"mdf-3","label":"MDF 3mm","rate":150},{"key":"mdf-6","label":"MDF 6mm","rate":220},{"key":"plywood-4","label":"Plywood 4mm","rate":200},{"key":"plywood-6","label":"Plywood 6mm","rate":260},{"key":"leather-2","label":"Leather 1\u20132mm","rate":350},{"key":"leather-4","label":"Leather 3\u20134mm","rate":500},{"key":"fabric","label":"Fabric / Felt","rate":120}]'),
  ('p3_rates',          '{"hourly":500,"perGram":4.5,"minJob":800,"setup":200,"sand":300,"prime":400,"paint":800,"assemble":500,"rushPct":50,"resinPct":40}'),
  ('services_config',   '[{"key":"laser","label":"Laser Cutting & Engraving","icon":"⚡","enabled":true,"turnaround":"1\u20133 days","desc":"CO\u2082 laser cutting in acrylic, wood, leather and fabric."},{"key":"print3d","label":"3D Printing (FDM)","icon":"🖨️","enabled":true,"turnaround":"24\u201372h","desc":"FDM printing in PLA+, PETG, TPU, ABS."},{"key":"resin","label":"Resin Printing","icon":"💧","enabled":false,"turnaround":"2\u20134 days","desc":"MSLA resin printing for miniatures and fine detail props."},{"key":"waterjet","label":"Water Jet Cutting","icon":"💧","enabled":false,"turnaround":"TBD","desc":"High-pressure water jet cutting for metals and stone."},{"key":"cnc","label":"CNC Routing","icon":"⚙️","enabled":false,"turnaround":"2\u20135 days","desc":"CNC routing for wood, aluminium, and foam."},{"key":"vinyl","label":"Vinyl Cutting","icon":"✂️","enabled":false,"turnaround":"1\u20132 days","desc":"Precision vinyl cutting for stickers and decals."}]')
on conflict (key) do nothing;
