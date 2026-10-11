-- ============================================================
-- Lets an admin flag an individual USD (international) payment method
-- to ALSO show to Pakistan visitors, in addition to international ones
-- (e.g. a Payoneer/Binance option some Pakistani customers may prefer).
-- PKR methods are unaffected — they already show to Pakistan visitors.
-- Run once in Supabase Dashboard -> SQL Editor -> New Query.
-- ============================================================

alter table payment_methods add column if not exists show_in_pakistan boolean not null default false;
