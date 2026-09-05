-- Phase 2, file 3 of 4. Separate from the policies file so a policy failure cannot roll the bucket back
-- (the CLI applies each file in one transaction). See docs/PLAN.md §2.3.
-- 20260902000003_storage_bucket.sql — private bucket.
-- The mime allow-list and size cap are enforced by storage-api on every upload, including uploads through
-- signed upload URLs. This is the "storage bucket policy" the brief asks for; the next file adds "which path".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'claim-files', 'claim-files', false,
  26214400,                                                      -- 25 MiB (open question 3)
  array['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
