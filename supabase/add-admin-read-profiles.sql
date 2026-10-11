-- ============================================================
-- AYZ Software Agency — Admin can read all customer profiles
-- Run this once in Supabase Dashboard → SQL Editor → New Query
--
-- Needed for the admin panel's Customers tab. Without this, the
-- existing "Users read own profile" policy only ever lets a customer
-- see their own single row, so the admin's query would return nothing
-- for anyone else.
-- ============================================================

drop policy if exists "Admin read all profiles" on profiles;
create policy "Admin read all profiles" on profiles for select using (is_admin());
