-- ============================================================
-- AYZ Software Agency — Per-tool checkout pricing
-- Run this once in Supabase Dashboard → SQL Editor → New Query
--
-- Adds 6 optional price columns to the `tools` table so each tool
-- can have its own Monthly / Half-Yearly / Yearly price (PKR + USD).
-- Any field left NULL for a tool falls back to the site-wide default
-- prices in Settings — nothing breaks for tools you don't touch.
-- ============================================================

alter table tools add column if not exists price_monthly numeric;
alter table tools add column if not exists price_half_yearly numeric;
alter table tools add column if not exists price_yearly numeric;
alter table tools add column if not exists price_monthly_usd numeric;
alter table tools add column if not exists price_half_yearly_usd numeric;
alter table tools add column if not exists price_yearly_usd numeric;
