-- ============================================================
-- One-time migration: USD pricing for international visitors
-- + Binance payment details.
-- Run this once in Supabase Dashboard → SQL Editor → New Query.
-- Safe to run more than once.
-- ============================================================

alter table bundles add column if not exists price_usd numeric;

-- Only sets the initial default — won't overwrite a price you've
-- already customized from the admin panel if this is run again.
update bundles set price_usd = 15 where bundle_id = 'all-in-one' and price_usd is null;
update bundles set price_usd = 10 where bundle_id in ('graphic', 'seo', 'youtube', 'amazon') and price_usd is null;

-- do nothing on conflict — won't reset a Binance ID you've already
-- added from the admin panel if this is run again.
insert into settings (key, value) values
  ('price_monthly_usd', '5'),
  ('price_half_yearly_usd', '20'),
  ('price_yearly_usd', '30'),
  ('payment_method_usd', 'Binance'),
  ('payment_number_usd', ''),
  ('payment_holder_usd', '')
on conflict (key) do nothing;
