-- ============================================================
-- AYZ Software Agency — Live / Out of Stock toggle for tools
-- Run this once in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

alter table tools add column if not exists is_live boolean not null default true;
