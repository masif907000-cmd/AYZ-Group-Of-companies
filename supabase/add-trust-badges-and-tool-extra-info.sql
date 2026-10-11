-- ============================================================
-- Trust badges (the "Why Buy From Us" boxes on tool/bundle pages)
-- + a free-text "extra info" field per tool.
-- Run once in Supabase Dashboard -> SQL Editor -> New Query.
-- ============================================================

create table if not exists trust_badges (
  id uuid primary key default gen_random_uuid(),
  icon text,
  label text not null,
  active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table trust_badges enable row level security;

drop policy if exists "Public read active trust badges" on trust_badges;
drop policy if exists "Authenticated read all trust badges" on trust_badges;
drop policy if exists "Authenticated write trust badges" on trust_badges;
drop policy if exists "Authenticated update trust badges" on trust_badges;
drop policy if exists "Authenticated delete trust badges" on trust_badges;

create policy "Public read active trust badges" on trust_badges for select using (active = true);
create policy "Authenticated read all trust badges" on trust_badges for select using (is_admin());
create policy "Authenticated write trust badges" on trust_badges for insert with check (is_admin());
create policy "Authenticated update trust badges" on trust_badges for update using (is_admin());
create policy "Authenticated delete trust badges" on trust_badges for delete using (is_admin());

-- Seed with the badges that used to be hardcoded on tool-detail.html / bundle-detail.html
insert into trust_badges (icon, label, sort_order)
select * from (values
  ('🛡️', '100% Working Warranty', 1),
  ('♾️', 'Unlimited Working 100%', 2),
  ('🧩', 'Extension Base Account', 3),
  ('📈', 'Tools Uptime 99%', 4),
  ('🔒', '100% Fast & Secure', 5),
  ('⚡', 'Instant Delivery After Payment', 6),
  ('💬', '24/7 WhatsApp Support', 7),
  ('✅', 'Real & Verified Access — No Fake Tools', 8)
) as seed(icon, label, sort_order)
where not exists (select 1 from trust_badges);

-- Free-text field admin can fill per tool (e.g. "Includes 45 credits/month"),
-- shown on that tool's page only when non-empty.
alter table tools add column if not exists extra_info text;
