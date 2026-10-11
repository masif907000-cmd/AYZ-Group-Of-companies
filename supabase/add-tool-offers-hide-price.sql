-- Offer prices (shown as discounted price with the regular price struck through)
-- and per-tool "hide price" switch (visitors are sent to WhatsApp instead).
alter table tools
  add column if not exists offer_monthly numeric,
  add column if not exists offer_half_yearly numeric,
  add column if not exists offer_yearly numeric,
  add column if not exists offer_monthly_usd numeric,
  add column if not exists offer_half_yearly_usd numeric,
  add column if not exists offer_yearly_usd numeric,
  add column if not exists price_hidden boolean not null default false;
