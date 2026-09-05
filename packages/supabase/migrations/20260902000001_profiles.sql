-- ============================================================
-- Phase 1: role enum, profiles, updated_at helper, auth.users trigger, is_admin(), profiles privileges + RLS
-- Applied as `postgres` via `supabase db push`. See docs/PLAN.md §2.1.
-- ============================================================

create type public.user_role as enum ('agent', 'admin');

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  role             public.user_role not null default 'agent',
  full_name        text not null default '',
  expo_push_token  text,
  created_at       timestamptz not null default now(),   -- [addition] orders the agents page
  updated_at       timestamptz not null default now(),   -- [addition]
  constraint profiles_full_name_length check (char_length(full_name) <= 200)
);

comment on table public.profiles is 'One row per auth.users row, created by trigger. role is promoted by hand in SQL.';

create index profiles_role_idx on public.profiles (role);

-- Generic updated_at maintenance (reused by claims in Phase 2).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile on sign-up. full_name comes from signUp({ options: { data: { full_name } } }).
-- role is never read from metadata, so a client cannot self-assign admin.
-- SECURITY DEFINER: the trigger fires as supabase_auth_admin, which has no privileges on public.profiles.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 200), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The single role predicate used by every policy. SECURITY DEFINER so it reads profiles without re-entering
-- the profiles policies (avoids "infinite recursion detected in policy"). STABLE so the planner evaluates it
-- once per statement when written as (select public.is_admin()).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------- privileges ----------
-- Supabase grants ALL to anon/authenticated by default; take it back and re-grant exactly what is needed.
-- Column-level UPDATE means role/id/created_at are never client-settable, before RLS is even evaluated.
revoke all on table public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, expo_push_token) on public.profiles to authenticated;
-- no INSERT (trigger only), no DELETE (cascade from auth.users only)

-- ---------- RLS ----------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- admins see every profile (agents page, assignment dropdown, push-token lookup)
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policies. Admins never update other profiles through PostgREST (it would expose role);
-- the one such write (push-token invalidation, Phase 5) uses the service role.
-- Promote an admin by hand:  update public.profiles set role = 'admin' where id = '<auth user uuid>';
