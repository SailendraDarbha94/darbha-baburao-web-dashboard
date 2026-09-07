-- Phase 2, file 4 of 4. See docs/PLAN.md §2.3 (and its fallback note if this file is rejected).
-- 20260902000004_storage_policies.sql — storage.objects already has RLS enabled by Supabase.
-- I9: every object must correspond to a claim_files row (storage_path = object name). The route handler inserts
-- that row before requesting the signed upload URL, so only API-registered paths are uploadable.

-- agent: sign an upload URL for own claim while draft. storage-api evaluates THIS policy when
-- createSignedUploadUrl() is called.
create policy claim_files_storage_insert_agent on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'claim-files'
    and exists (
      select 1
      from public.claim_files f
      join public.claims c on c.id = f.claim_id
      where f.storage_path = objects.name
        and f.uploaded_by = (select auth.uid())
        and c.agent_id   = (select auth.uid())
        and c.status = 'draft'
    )
  );

-- agent: read (signed download URLs) for own claims
create policy claim_files_storage_select_agent on storage.objects
  for select to authenticated
  using (
    bucket_id = 'claim-files'
    and exists (
      select 1
      from public.claim_files f
      join public.claims c on c.id = f.claim_id
      where f.storage_path = objects.name
        and c.agent_id = (select auth.uid())
    )
  );

-- agent: remove only while draft. The route deletes the object BEFORE the row because this policy needs the row to exist.
create policy claim_files_storage_delete_agent on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'claim-files'
    and exists (
      select 1
      from public.claim_files f
      join public.claims c on c.id = f.claim_id
      where f.storage_path = objects.name
        and c.agent_id = (select auth.uid())
        and c.status = 'draft'
    )
  );

-- admin: read every REGISTERED object (signed download URLs for the dashboard). The join keeps I9 true for admins
-- too: an object whose claim_files row was pruned (decision f) is unreachable by anyone. claim_files_select_admin
-- makes every row visible to this subquery when is_admin() holds.
create policy claim_files_storage_select_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'claim-files'
    and (select public.is_admin())
    and exists (
      select 1 from public.claim_files f
      where f.storage_path = objects.name
    )
  );

-- no UPDATE policy (objects are never overwritten; x-upsert is never sent); no admin insert/delete.
