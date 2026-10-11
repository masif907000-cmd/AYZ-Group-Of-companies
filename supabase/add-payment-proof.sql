-- ============================================================
-- AYZ Software Agency — Transaction ID + payment screenshot upload
-- Run this once in Supabase Dashboard → SQL Editor → New Query
--
-- Adds transaction_id + screenshot_url to `orders`, and a public
-- storage bucket for the uploaded screenshots.
-- ============================================================

alter table orders add column if not exists transaction_id text;
alter table orders add column if not exists screenshot_url text;

insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', true)
on conflict (id) do nothing;

drop policy if exists "Public can upload payment screenshots" on storage.objects;
drop policy if exists "Public can view payment screenshots" on storage.objects;
create policy "Public can upload payment screenshots" on storage.objects
  for insert with check (bucket_id = 'payment-screenshots');
create policy "Public can view payment screenshots" on storage.objects
  for select using (bucket_id = 'payment-screenshots');
