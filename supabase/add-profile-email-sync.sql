-- ============================================================
-- Keeps profiles.email in sync when a customer changes their email
-- via "My Account" (auth.users.email only actually changes once they
-- confirm the change via the link sent to their new address — this
-- trigger fires at that point, not before).
-- Run once in Supabase Dashboard -> SQL Editor -> New Query.
-- ============================================================

create or replace function sync_profile_email() returns trigger
language plpgsql security definer as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function sync_profile_email();
