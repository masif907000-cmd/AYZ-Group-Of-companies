-- ============================================================
-- Links each order to the customer account that placed it, so a
-- logged-in customer can see their own purchase history ("My Account").
-- Existing orders (placed before this) will have a null user_id and
-- just won't show up in that list.
-- Run once in Supabase Dashboard -> SQL Editor -> New Query.
-- ============================================================

alter table orders add column if not exists user_id uuid references auth.users(id);

drop policy if exists "Users read own orders" on orders;
create policy "Users read own orders" on orders for select using (auth.uid() = user_id);
