-- The Hyper Store feature migration: Hype Coins + signup offer leads.
-- Run this once in Supabase SQL Editor before deploying the matching application changes.
begin;

alter table public.profiles
  add column if not exists hype_coins integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_hype_coins_nonnegative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_hype_coins_nonnegative check (hype_coins >= 0);
  end if;
end $$;

-- Keep customers from editing their own Hype Coins or role through the existing
-- profile update policy. Admins retain normal administrative access.
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() = old.id
     and not public.is_admin() then
    new.role := old.role;
    new.hype_coins := old.hype_coins;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
create trigger protect_profile_admin_fields_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_admin_fields();

-- An explicit RPC is used by the admin UI so the write is checked server-side.
create or replace function public.admin_set_hype_coins(p_user_id uuid, p_hype_coins integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_user_id is null then
    raise exception 'Customer id is required';
  end if;
  if p_hype_coins is null or p_hype_coins < 0 then
    raise exception 'Hype Coins must be a non-negative whole number';
  end if;
  update public.profiles set hype_coins = p_hype_coins where id = p_user_id;
  if not found then
    raise exception 'Customer profile not found';
  end if;
end;
$$;

revoke all on function public.admin_set_hype_coins(uuid, integer) from public;
grant execute on function public.admin_set_hype_coins(uuid, integer) to authenticated;

create table if not exists public.marketing_signups (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  source text not null default 'first_visit_popup',
  created_at timestamptz not null default now(),
  constraint marketing_signups_name_nonempty check (char_length(trim(full_name)) > 0),
  constraint marketing_signups_india_phone check (phone ~ '^\+91[0-9]{10}$'),
  constraint marketing_signups_source check (source = 'first_visit_popup')
);
alter table public.marketing_signups enable row level security;
grant insert on public.marketing_signups to anon, authenticated;
revoke all on public.marketing_signups from public;

drop policy if exists marketing_signups_insert_public on public.marketing_signups;
create policy marketing_signups_insert_public
  on public.marketing_signups for insert to anon, authenticated
  with check (
    char_length(trim(full_name)) > 0
    and phone ~ '^\+91[0-9]{10}$'
    and source = 'first_visit_popup'
  );

commit;
