-- ============================================================
-- release_push_token(): one device, one account — without the service role.
-- Applied as `postgres` via `supabase db push`. See docs/PLAN.md §2.4.
-- ============================================================

-- POST /api/me/push-token stores the caller's Expo push token on their own profiles row (RLS: own row). Before it
-- does, the same token must be cleared from any OTHER profile still holding it: a previous account on a shared
-- phone whose sign-out never reached the API would otherwise keep receiving pushes about its claims on that phone.
--
-- profiles deliberately has no cross-user UPDATE policy (it would expose role), and the brief wants agent routes to
-- run as the caller, so the cross-user write lives here as SECURITY DEFINER instead of behind the service-role key.
-- Scope is as narrow as the sentence above: only expo_push_token, only rows other than the caller's, only rows
-- holding exactly this token. Knowing a token already lets anyone push to that device through Expo's public API,
-- so being able to clear it from a profile is not a new capability.
create or replace function public.release_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'release_push_token requires an authenticated caller' using errcode = '42501';
  end if;
  if p_token is null or p_token = '' then
    return;
  end if;
  update public.profiles
     set expo_push_token = null
   where expo_push_token = p_token
     and id <> v_uid;
end;
$$;

-- Supabase's default privileges grant EXECUTE to anon/authenticated/service_role; keep it to signed-in callers.
revoke all on function public.release_push_token(text) from public, anon;
grant execute on function public.release_push_token(text) to authenticated;
