-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V7.sql
-- ADDITIVE: safe to run on top of V1–V6
-- Adds:
--   • products.id changed to TEXT (supports readable slug IDs)
--   • products.variants column (JSONB array of {color,hex,stock})
--   • decrement_stock_for_order rewritten for variants + text IDs
--   • check_stock_availability rewritten for variants + text IDs
--   • trigger now fires on 'cod' orders as well as 'paid'
-- ================================================================

-- ── 1. Change products.id from UUID to TEXT ───────────────────
-- This is safe because UUID values are valid text.
-- Must drop foreign-key constraints first if any (none in this schema).
ALTER TABLE products ALTER COLUMN id TYPE text;

-- ── 2. Add variants column to products ────────────────────────
-- Array of { color, hex, stock } objects stored as JSONB.
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants jsonb;

-- ── 3. Rewrite decrement_stock_for_order ─────────────────────
-- Handles:
--   • Text (slug) product IDs
--   • Per-variant stock deduction when selectedColor is set
--   • Falls back to top-level stock for products without variants
CREATE OR REPLACE FUNCTION decrement_stock_for_order(p_order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item           jsonb;
  prod_id        text;
  item_qty       integer;
  selected_color text;
  v_idx          integer;
  v_stock        integer;
BEGIN
  FOR item IN
    SELECT jsonb_array_elements(o.items)
    FROM orders o
    WHERE o.id = p_order_id
  LOOP
    prod_id        := item->>'id';
    item_qty       := COALESCE((item->>'qty')::integer, 1);
    selected_color := item->>'selectedColor';

    -- If a colour variant was selected, decrement that variant's stock
    IF selected_color IS NOT NULL AND selected_color <> '' THEN
      -- Find the 0-based index of the matching variant
      SELECT (t.pos - 1)::integer INTO v_idx
      FROM products p,
           LATERAL jsonb_array_elements(p.variants) WITH ORDINALITY t(v, pos)
      WHERE p.id = prod_id
        AND t.v->>'color' = selected_color
      LIMIT 1;

      IF v_idx IS NOT NULL THEN
        -- Read current variant stock
        SELECT (p.variants->v_idx->>'stock')::integer INTO v_stock
        FROM products p WHERE p.id = prod_id;

        -- Write updated variant stock (floor at 0)
        UPDATE products
        SET variants = jsonb_set(
              variants,
              ARRAY[v_idx::text, 'stock'],
              to_jsonb(GREATEST(COALESCE(v_stock, 0) - item_qty, 0))
            ),
            updated_at = now()
        WHERE id = prod_id;

        CONTINUE; -- skip top-level stock update
      END IF;
    END IF;

    -- Fallback: decrement top-level stock
    UPDATE products
    SET stock      = GREATEST(stock - item_qty, 0),
        updated_at = now()
    WHERE id = prod_id;
  END LOOP;
END;
$$;

-- ── 4. Rewrite check_stock_availability ──────────────────────
-- Now accepts { id, qty, selectedColor? } per cart item.
-- Checks variant stock when selectedColor is provided.
CREATE OR REPLACE FUNCTION check_stock_availability(cart_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item           jsonb;
  prod_id        text;
  item_qty       integer;
  selected_color text;
  prod_name      text;
  top_stock      integer;
  v_stock        integer;
  available      integer;
  issues         jsonb := '[]'::jsonb;
BEGIN
  FOR item IN SELECT jsonb_array_elements(cart_items)
  LOOP
    prod_id        := item->>'id';
    item_qty       := COALESCE((item->>'qty')::integer, 1);
    selected_color := item->>'selectedColor';

    SELECT name, stock INTO prod_name, top_stock
    FROM products WHERE id = prod_id;

    IF NOT FOUND THEN CONTINUE; END IF;

    IF selected_color IS NOT NULL AND selected_color <> '' THEN
      -- Read variant stock
      SELECT (t.v->>'stock')::integer INTO v_stock
      FROM products p,
           LATERAL jsonb_array_elements(p.variants) WITH ORDINALITY t(v, pos)
      WHERE p.id = prod_id
        AND t.v->>'color' = selected_color
      LIMIT 1;

      available := COALESCE(v_stock, top_stock, 0);
    ELSE
      available := COALESCE(top_stock, 0);
    END IF;

    IF available < item_qty THEN
      issues := issues || jsonb_build_object(
        'id',        prod_id,
        'name',      prod_name,
        'requested', item_qty,
        'available', available
      );
    END IF;
  END LOOP;

  RETURN issues;
END;
$$;

-- ── 5. Update trigger to also fire on 'cod' orders ───────────
-- COD orders are confirmed immediately on insert; they should also
-- deduct stock just like paid PayHere orders do.
CREATE OR REPLACE FUNCTION trigger_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fire when status transitions INTO 'paid' or 'cod'
  -- (prevents double-deduction if the order is updated again)
  IF new.status IN ('paid', 'cod')
     AND (old.status IS NULL OR old.status NOT IN ('paid', 'cod'))
  THEN
    PERFORM decrement_stock_for_order(new.id);
  END IF;
  RETURN new;
END;
$$;

-- Replace old trigger functions with the unified one
DROP TRIGGER IF EXISTS on_order_paid        ON orders;
DROP TRIGGER IF EXISTS on_order_insert_paid ON orders;

CREATE TRIGGER on_order_stock_update
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_stock_on_order();

CREATE TRIGGER on_order_stock_insert
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_stock_on_order();
