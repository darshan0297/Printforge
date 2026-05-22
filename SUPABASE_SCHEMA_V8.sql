-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V8.sql
-- ADDITIVE: safe to run on top of V1–V7
-- Adds:
--   • orders.admin_comment column (text visible to customer on tracking page)
-- ================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_comment text;
