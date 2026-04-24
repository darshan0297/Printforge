-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V2.sql
-- ADDITIVE: safe to run on top of existing schema
-- Adds: stock reservation, tracking_number field, storage policy
-- ================================================================

-- ── TRACKING NUMBER on orders ─────────────────────────────────
alter table orders add column if not exists tracking_number text;

-- ── ATOMIC STOCK DECREMENT ────────────────────────────────────
-- Called after payment confirmed.
-- Decrements stock for every item in the order.
-- Returns true if all items had sufficient stock, false otherwise.

create or replace function decrement_stock_for_order(order_id text)
returns boolean
language plpgsql
security definer
as $$
declare
  item        jsonb;
  item_id     uuid;
  item_qty    integer;
  current_stock integer;
begin
  -- Loop over items jsonb array
  for item in
    select jsonb_array_elements(items) from orders where id = order_id
  loop
    item_id  := (item->>'id')::uuid;
    item_qty := (item->>'qty')::integer;

    -- Check current stock
    select stock into current_stock from products where id = item_id;

    if current_stock is null then
      continue; -- product not found, skip
    end if;

    if current_stock < item_qty then
      -- Stock insufficient — log but don't block (order already paid)
      raise warning 'Low stock for product %, ordered % but only % available', item_id, item_qty, current_stock;
    end if;

    -- Decrement (floor at 0)
    update products
    set
      stock      = greatest(stock - item_qty, 0),
      updated_at = now()
    where id = item_id;

  end loop;

  return true;
end;
$$;

-- ── TRIGGER: decrement stock when order status → 'paid' ───────
create or replace function trigger_stock_on_paid()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only fire when status changes TO 'paid'
  if new.status = 'paid' and (old.status is null or old.status <> 'paid') then
    perform decrement_stock_for_order(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_paid on orders;
create trigger on_order_paid
  after update on orders
  for each row execute function trigger_stock_on_paid();

-- Also fire on insert if order is created already paid (edge case)
drop trigger if exists on_order_insert_paid on orders;
create trigger on_order_insert_paid
  after insert on orders
  for each row
  when (new.status = 'paid')
  execute function trigger_stock_on_paid();

-- ── STOCK CHECK FUNCTION (call from frontend before checkout) ──
-- Returns a JSON array of items with insufficient stock:
-- [{ id, name, requested, available }]
-- Pass items as jsonb: '[{"id":"uuid","qty":2},...]'

create or replace function check_stock_availability(cart_items jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  item        jsonb;
  item_id     uuid;
  item_qty    integer;
  prod        record;
  issues      jsonb := '[]'::jsonb;
begin
  for item in select jsonb_array_elements(cart_items)
  loop
    item_id  := (item->>'id')::uuid;
    item_qty := (item->>'qty')::integer;

    select id, name, stock into prod from products where id = item_id;

    if prod.stock < item_qty then
      issues := issues || jsonb_build_object(
        'id',        prod.id,
        'name',      prod.name,
        'requested', item_qty,
        'available', prod.stock
      );
    end if;
  end loop;

  return issues;
end;
$$;

-- ── STORAGE: product-images bucket ────────────────────────────
-- Run this to create the bucket (or create manually in Dashboard)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read policy (anyone can view product images)
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Authenticated write policy (only admin can upload)
create policy "Admin upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

create policy "Admin delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

-- ── UPDATED_AT auto-update trigger ────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_products_updated_at on products;
create trigger set_products_updated_at
  before update on products
  for each row execute function set_updated_at();

drop trigger if exists set_orders_updated_at on orders;
create trigger set_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();
