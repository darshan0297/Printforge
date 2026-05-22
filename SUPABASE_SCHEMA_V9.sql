-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V9.sql
-- ADDITIVE: safe to run on top of V1–V8
-- Fixes:
--   • products.model_url column (used by 3D model viewer + badge)
--   • product_views table (used by trackProductView in app.js)
-- ================================================================

-- ── 1. Add model_url to products ─────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS model_url text;

-- ── 2. Create product_views table ────────────────────────────
CREATE TABLE IF NOT EXISTS product_views (
  product_id  text NOT NULL,
  session_id  text NOT NULL,
  viewed_at   timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, session_id)
);

ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

-- Anyone can record a view (called from storefront, no auth)
CREATE POLICY "Public can insert product views"
  ON product_views FOR INSERT
  WITH CHECK (true);

-- Anyone can upsert (needed for ignoreDuplicates upsert pattern)
CREATE POLICY "Public can upsert product views"
  ON product_views FOR UPDATE
  USING (true);

-- Only admin can read analytics
CREATE POLICY "Admin read product views"
  ON product_views FOR SELECT
  USING (auth.role() = 'authenticated');
