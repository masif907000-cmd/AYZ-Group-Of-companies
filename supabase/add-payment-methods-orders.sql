-- ============================================================
-- Migration: multiple payment methods (admin-managed) + order
-- tracking (auto-captured at checkout, manually manageable too).
-- Run this once in Supabase Dashboard → SQL Editor → New Query.
-- ============================================================

-- ---------- Payment methods ----------
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  currency text not null,              -- 'PKR' | 'USD'
  payment_type text not null,          -- e.g. 'Binance', 'Bank', 'NayaPay'
  method_name text not null,
  account_id text not null,            -- UID / number / wallet address
  account_holder text,
  iban text,                           -- optional, for bank transfer
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table payment_methods enable row level security;

drop policy if exists "Public read active payment methods" on payment_methods;
drop policy if exists "Authenticated read all payment methods" on payment_methods;
drop policy if exists "Authenticated write payment methods" on payment_methods;
drop policy if exists "Authenticated update payment methods" on payment_methods;
drop policy if exists "Authenticated delete payment methods" on payment_methods;

create policy "Public read active payment methods" on payment_methods for select using (active = true);
create policy "Authenticated read all payment methods" on payment_methods for select using (auth.role() = 'authenticated');
create policy "Authenticated write payment methods" on payment_methods for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update payment methods" on payment_methods for update using (auth.role() = 'authenticated');
create policy "Authenticated delete payment methods" on payment_methods for delete using (auth.role() = 'authenticated');

-- Seed today's two live payment methods (pulled from the existing
-- settings rows) so checkout keeps working right after this migration.
insert into payment_methods (currency, payment_type, method_name, account_id, account_holder, sort_order)
select 'PKR', 'NayaPay', s_method.value, s_number.value, s_holder.value, 1
from settings s_method
left join settings s_number on s_number.key = 'payment_number'
left join settings s_holder on s_holder.key = 'payment_holder'
where s_method.key = 'payment_method'
  and not exists (select 1 from payment_methods where currency = 'PKR');

insert into payment_methods (currency, payment_type, method_name, account_id, account_holder, sort_order)
select 'USD', 'Binance', s_method.value, coalesce(s_number.value, ''), s_holder.value, 1
from settings s_method
left join settings s_number on s_number.key = 'payment_number_usd'
left join settings s_holder on s_holder.key = 'payment_holder_usd'
where s_method.key = 'payment_method_usd'
  and not exists (select 1 from payment_methods where currency = 'USD');

-- ---------- Orders ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,             -- 'tool' | 'bundle'
  item_name text not null,
  plan_label text,                     -- Monthly/Half-Yearly/Yearly, or bundle name
  price numeric not null,
  currency text not null,
  payment_method text,                 -- method label chosen at checkout
  customer_name text,
  customer_contact text,
  status text not null default 'pending',  -- 'pending' | 'confirmed' | 'cancelled'
  notes text,
  created_at timestamptz default now()
);

alter table orders enable row level security;

drop policy if exists "Public can create orders" on orders;
drop policy if exists "Authenticated read orders" on orders;
drop policy if exists "Authenticated update orders" on orders;
drop policy if exists "Authenticated delete orders" on orders;

-- Anyone (including logged-out checkout visitors) can CREATE an order —
-- but only the authenticated admin can ever read/update/delete one.
-- This is intentionally asymmetric: it's the only table in this schema
-- where "public" does not also mean "publicly readable".
create policy "Public can create orders" on orders for insert with check (true);
create policy "Authenticated read orders" on orders for select using (auth.role() = 'authenticated');
create policy "Authenticated update orders" on orders for update using (auth.role() = 'authenticated');
create policy "Authenticated delete orders" on orders for delete using (auth.role() = 'authenticated');
