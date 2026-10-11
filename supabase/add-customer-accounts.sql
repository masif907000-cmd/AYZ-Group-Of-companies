-- ============================================================
-- Migration: customer accounts (signup/login) + a critical fix to
-- every admin-only policy in this schema.
--
-- WHY THE POLICY REWRITE IS HERE: every existing "Authenticated ..."
-- policy in this project checks auth.role() = 'authenticated', which
-- just means "someone is logged in" — NOT "this is the admin". Once
-- ordinary customers can sign up and log in (this migration adds
-- that), every one of those policies would start passing for any
-- logged-in customer too, letting them edit tools/prices/payment
-- methods and read every customer's order info. This migration adds
-- a profiles.role column and swaps every one of those checks for
-- is_admin() so only the real admin account still passes them.
--
-- Run this once in Supabase Dashboard → SQL Editor → New Query.
-- Safe to run more than once.
-- ============================================================

-- ---------- Profiles (one row per signed-up user) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'customer',   -- 'customer' | 'admin'
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Users update own profile" on profiles;
drop policy if exists "Users insert own profile" on profiles;
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- ---------- is_admin() helper, used by every admin-only policy below ----------
create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Auto-create a 'customer' profile row on every new signup ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role) values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Backfill: your existing admin login predates this migration ----------
insert into profiles (id, email, role)
select id, email, 'customer' from auth.users
where id not in (select id from profiles);

-- ⚠️ EDIT THIS LINE — replace with the exact email you use to log
-- into admin.html, then run this file. This is what actually makes
-- your account the admin; everyone else stays a regular customer.
update profiles set role = 'admin' where email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL';

-- ============================================================
-- Re-point every admin-only policy at is_admin() instead of
-- auth.role() = 'authenticated'.
-- ============================================================

-- tools
drop policy if exists "Authenticated write tools" on tools;
drop policy if exists "Authenticated update tools" on tools;
drop policy if exists "Authenticated delete tools" on tools;
create policy "Authenticated write tools" on tools for insert with check (is_admin());
create policy "Authenticated update tools" on tools for update using (is_admin());
create policy "Authenticated delete tools" on tools for delete using (is_admin());

-- bundles
drop policy if exists "Authenticated write bundles" on bundles;
drop policy if exists "Authenticated update bundles" on bundles;
drop policy if exists "Authenticated delete bundles" on bundles;
create policy "Authenticated write bundles" on bundles for insert with check (is_admin());
create policy "Authenticated update bundles" on bundles for update using (is_admin());
create policy "Authenticated delete bundles" on bundles for delete using (is_admin());

-- settings
drop policy if exists "Authenticated write settings" on settings;
drop policy if exists "Authenticated update settings" on settings;
drop policy if exists "Authenticated delete settings" on settings;
create policy "Authenticated write settings" on settings for insert with check (is_admin());
create policy "Authenticated update settings" on settings for update using (is_admin());
create policy "Authenticated delete settings" on settings for delete using (is_admin());

-- guides
drop policy if exists "Authenticated write guides" on guides;
drop policy if exists "Authenticated update guides" on guides;
drop policy if exists "Authenticated delete guides" on guides;
create policy "Authenticated write guides" on guides for insert with check (is_admin());
create policy "Authenticated update guides" on guides for update using (is_admin());
create policy "Authenticated delete guides" on guides for delete using (is_admin());

-- payment_methods
drop policy if exists "Authenticated read all payment methods" on payment_methods;
drop policy if exists "Authenticated write payment methods" on payment_methods;
drop policy if exists "Authenticated update payment methods" on payment_methods;
drop policy if exists "Authenticated delete payment methods" on payment_methods;
create policy "Authenticated read all payment methods" on payment_methods for select using (is_admin());
create policy "Authenticated write payment methods" on payment_methods for insert with check (is_admin());
create policy "Authenticated update payment methods" on payment_methods for update using (is_admin());
create policy "Authenticated delete payment methods" on payment_methods for delete using (is_admin());

-- orders
drop policy if exists "Authenticated read orders" on orders;
drop policy if exists "Authenticated update orders" on orders;
drop policy if exists "Authenticated delete orders" on orders;
create policy "Authenticated read orders" on orders for select using (is_admin());
create policy "Authenticated update orders" on orders for update using (is_admin());
create policy "Authenticated delete orders" on orders for delete using (is_admin());
