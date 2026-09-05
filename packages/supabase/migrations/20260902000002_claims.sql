-- ============================================================
-- Phase 2: enums, claims, claim_files, claim_notes, claim_events, guard + audit triggers, privileges, RLS
-- Applied as `postgres` via `supabase db push`. See docs/PLAN.md §2.2.
-- ============================================================

create type public.claim_status    as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'info_requested');
create type public.note_visibility as enum ('internal', 'agent_visible');

-- ---------- claims ----------
create table public.claims (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references public.profiles (id) on delete restrict,
  assigned_to    uuid references public.profiles (id) on delete set null,
  status         public.claim_status not null default 'draft',
  title          text not null,
  description    text not null default '',
  claim_type     text not null,                 -- free-form; pick-list is CLAIM_TYPES in @claims/shared; deliberately no CHECK
  incident_date  date,                          -- nullable: drafts may be incomplete (decision o)
  policy_number  text,
  claimant_name  text,
  details        jsonb not null default '{}'::jsonb,   -- extension point; validated by claimDetailsSchema (permissive record)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint claims_title_length         check (char_length(title) between 1 and 200),
  constraint claims_description_length   check (char_length(description) <= 20000),
  constraint claims_claim_type_length    check (char_length(claim_type) between 1 and 100),
  constraint claims_policy_number_length check (policy_number is null or char_length(policy_number) <= 100),
  constraint claims_claimant_name_length check (claimant_name is null or char_length(claimant_name) <= 200),
  constraint claims_details_is_object    check (jsonb_typeof(details) = 'object')
);

create index claims_agent_id_idx    on public.claims (agent_id, created_at desc);
create index claims_status_idx      on public.claims (status, created_at desc);
create index claims_assigned_to_idx on public.claims (assigned_to) where assigned_to is not null;
create index claims_created_at_idx  on public.claims (created_at desc);

create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

-- ---------- claim_files ----------
create table public.claim_files (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid not null references public.claims (id) on delete restrict,
  uploaded_by   uuid not null references public.profiles (id) on delete restrict,
  storage_path  text not null default '' unique, -- set by trigger, never by the client (I8). The '' default exists only so
                                                --   `supabase gen types` marks the column optional in the Insert type (a NOT NULL
                                                --   column with no default is emitted as required, but the INSERT grant below
                                                --   excludes it). The BEFORE INSERT trigger overwrites it before NOT NULL/CHECK/
                                                --   UNIQUE are evaluated, so '' is never stored.
  file_name     text not null,
  mime_type     text not null,
  size_bytes    bigint not null,
  created_at    timestamptz not null default now(),

  constraint claim_files_mime_allowed    check (mime_type in ('image/jpeg', 'image/png', 'image/heic', 'application/pdf')),
  constraint claim_files_size            check (size_bytes > 0 and size_bytes <= 26214400),   -- 25 MiB, same literal as the bucket (open question 3)
  constraint claim_files_name_length     check (char_length(file_name) between 1 and 255),
  constraint claim_files_path_convention check (storage_path like claim_id::text || '/' || id::text || '-%')
);

create index claim_files_claim_id_idx on public.claim_files (claim_id);

-- storage_path = {claim_id}/{file_id}-{sanitised_file_name}, decided by the DB, not the caller.
-- Column defaults (id) are applied before BEFORE ROW triggers run, so new.id is populated here.
create or replace function public.claim_files_set_path()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_name text;
begin
  v_name := regexp_replace(new.file_name, '[^A-Za-z0-9._-]+', '_', 'g');
  v_name := left(trim(both '._' from v_name), 120);
  if v_name = '' then v_name := 'file'; end if;
  new.storage_path := new.claim_id::text || '/' || new.id::text || '-' || v_name;
  return new;
end;
$$;

create trigger claim_files_set_path
  before insert on public.claim_files
  for each row execute function public.claim_files_set_path();

-- ---------- claim_notes ----------
create table public.claim_notes (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references public.claims (id) on delete restrict,
  author_id   uuid not null references public.profiles (id) on delete restrict,
  body        text not null,
  visibility  public.note_visibility not null default 'internal',   -- default to the safe value
  created_at  timestamptz not null default now(),
  constraint claim_notes_body_length check (char_length(body) between 1 and 10000)
);

create index claim_notes_claim_id_idx on public.claim_notes (claim_id, created_at);

-- ---------- claim_events (append-only audit log) ----------
-- bigint identity, not uuid: deterministic timeline order when several events share one transaction timestamp.
-- ON DELETE RESTRICT everywhere an audit row points: the append-only triggers make cascade / set null impossible,
-- so deleting a claim or a user with history is a deliberate manual operation.
-- event_type: the brief requires status_changed, assigned, note_added (every admin action + every status change).
-- [addition] created, updated (column names only), file_reserved, file_removed so the admin timeline is complete.
-- Veto = drop the four values here and the corresponding trigger branches below.
create table public.claim_events (
  id          bigint generated always as identity primary key,
  claim_id    uuid not null references public.claims (id) on delete restrict,
  actor_id    uuid references public.profiles (id) on delete restrict,   -- null only when no JWT (SQL editor); never null via the app
  event_type  text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint claim_events_type check (event_type in
    ('created', 'updated', 'status_changed', 'assigned', 'note_added', 'file_reserved', 'file_removed')),
  constraint claim_events_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create index claim_events_claim_id_idx on public.claim_events (claim_id, id);

-- ============================================================
-- Guards (BEFORE triggers)
-- ============================================================

-- I6 + I7. RLS cannot compare OLD and NEW, so the exact transition rules live here (mirrored and unit-tested in
-- @claims/shared transitions.ts; each copy has a comment pointing at the other).
-- Two actors, not two roles: the claim's OWNER (agent_id = caller, whatever their role — an admin may sign in on mobile)
-- may make the agent transitions; an ADMIN may make the admin transitions. Both may hold for one caller.
-- Custom SQLSTATEs let the route handler map precisely: CL001 invalid transition, CL002 forbidden field change.
-- auth.uid() is null for the SQL editor and the service role: those callers get admin rules.
create or replace function public.claims_guard_update()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_uid   uuid    := auth.uid();
  v_admin boolean := (v_uid is null) or (select public.is_admin());
  v_owner boolean := coalesce(old.agent_id = v_uid, false);
  v_ok    boolean := false;
begin
  if new.agent_id <> old.agent_id then
    raise exception 'agent_id is immutable' using errcode = 'CL002';
  end if;

  if not v_admin and new.assigned_to is distinct from old.assigned_to then
    raise exception 'only admins can assign claims' using errcode = 'CL002';
  end if;

  if new.status is distinct from old.status then
    v_ok :=
      (v_owner and (
        (old.status = 'draft'          and new.status = 'submitted') or
        (old.status = 'info_requested' and new.status = 'submitted')
      ))
      or
      (v_admin and (
        (old.status = 'submitted'    and new.status = 'under_review') or
        (old.status = 'under_review' and new.status in ('approved', 'rejected', 'info_requested'))
      ));
    if not v_ok then
      raise exception 'invalid transition % -> %', old.status, new.status using errcode = 'CL001';
    end if;
  end if;

  return new;
end;
$$;

create trigger claims_guard_update
  before update on public.claims
  for each row execute function public.claims_guard_update();

-- I4: claim_events is append-only for every role, including postgres and service_role (triggers ignore RLS bypass).
create or replace function public.claim_events_block_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'claim_events is append-only' using errcode = 'CL003';
end;
$$;

create trigger claim_events_no_update   before update   on public.claim_events for each row       execute function public.claim_events_block_mutation();
create trigger claim_events_no_delete   before delete   on public.claim_events for each row       execute function public.claim_events_block_mutation();
create trigger claim_events_no_truncate before truncate on public.claim_events for each statement execute function public.claim_events_block_mutation();

-- ============================================================
-- Audit log (AFTER triggers). SECURITY DEFINER because no JWT role has INSERT on claim_events (I5): the insert runs
-- as the function owner (postgres), who owns the table, so RLS does not apply and no INSERT policy is needed.
-- actor_id = auth.uid() from the caller's JWT, which is why every claims/notes/files write uses a user-scoped client.
-- ============================================================

create or replace function public.claims_log_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor   uuid := auth.uid();
  v_changed text[];
begin
  if tg_op = 'INSERT' then
    insert into public.claim_events (claim_id, actor_id, event_type, payload)
    values (new.id, v_actor, 'created', jsonb_build_object('status', new.status));
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.claim_events (claim_id, actor_id, event_type, payload)
    values (new.id, v_actor, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.claim_events (claim_id, actor_id, event_type, payload)
    values (new.id, v_actor, 'assigned', jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to));
  end if;

  -- [addition] Content edits: column names only, no values.
  v_changed := array_remove(array[
    case when new.title         is distinct from old.title         then 'title' end,
    case when new.description   is distinct from old.description   then 'description' end,
    case when new.claim_type    is distinct from old.claim_type    then 'claim_type' end,
    case when new.incident_date is distinct from old.incident_date then 'incident_date' end,
    case when new.policy_number is distinct from old.policy_number then 'policy_number' end,
    case when new.claimant_name is distinct from old.claimant_name then 'claimant_name' end,
    case when new.details       is distinct from old.details       then 'details' end
  ], null);
  if cardinality(v_changed) > 0 then
    insert into public.claim_events (claim_id, actor_id, event_type, payload)
    values (new.id, v_actor, 'updated', jsonb_build_object('columns', to_jsonb(v_changed)));
  end if;

  return new;
end;
$$;

create trigger claims_log_change
  after insert or update on public.claims
  for each row execute function public.claims_log_change();

create or replace function public.claim_notes_log_added()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.claim_events (claim_id, actor_id, event_type, payload)
  values (new.claim_id, auth.uid(), 'note_added', jsonb_build_object('note_id', new.id, 'visibility', new.visibility));
  return new;
end;
$$;

create trigger claim_notes_log_added
  after insert on public.claim_notes
  for each row execute function public.claim_notes_log_added();

-- A claim_files row is a RESERVATION (signed URL issued); the bytes arrive later, outside the DB's view.
create or replace function public.claim_files_log_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.claim_events (claim_id, actor_id, event_type, payload)
    values (new.claim_id, auth.uid(), 'file_reserved',
            jsonb_build_object('file_id', new.id, 'file_name', new.file_name, 'mime_type', new.mime_type, 'size_bytes', new.size_bytes));
    return new;
  else
    insert into public.claim_events (claim_id, actor_id, event_type, payload)
    values (old.claim_id, auth.uid(), 'file_removed', jsonb_build_object('file_id', old.id, 'file_name', old.file_name));
    return old;
  end if;
end;
$$;

create trigger claim_files_log_change
  after insert or delete on public.claim_files
  for each row execute function public.claim_files_log_change();

-- ============================================================
-- Privileges (I5, I6, I8). Column lists are the first line of defence; policies and triggers the second and third.
-- PostgREST rejects the whole request (42501) if a client names a column outside the grant, so handlers build
-- insert/update objects strictly from zod output.
-- ============================================================
revoke all on table public.claims, public.claim_files, public.claim_notes, public.claim_events
  from anon, authenticated;
-- I5: Supabase's default privileges also grant ALL to service_role, which bypasses RLS. Take back every write on
-- claim_events so no JWT role (service key included) can forge the log; the audit triggers are SECURITY DEFINER
-- and insert as the table owner, so they are unaffected. SELECT is kept.
revoke insert, update, delete, truncate on public.claim_events from service_role;

grant select on public.claims to authenticated;
grant insert (agent_id, title, description, claim_type, incident_date, policy_number, claimant_name, details)
  on public.claims to authenticated;                                   -- status/assigned_to not settable on insert (defaults apply)
grant update (title, description, claim_type, incident_date, policy_number, claimant_name, details, status, assigned_to)
  on public.claims to authenticated;                                   -- id, agent_id, created_at, updated_at never updatable
-- no DELETE on claims for any JWT role (decision n)

grant select, delete on public.claim_files to authenticated;
grant insert (claim_id, uploaded_by, file_name, mime_type, size_bytes) on public.claim_files to authenticated;   -- storage_path excluded
-- no UPDATE on claim_files

grant select on public.claim_notes to authenticated;
grant insert (claim_id, author_id, body, visibility) on public.claim_notes to authenticated;
-- no UPDATE/DELETE on notes: corrections are new notes

grant select on public.claim_events to authenticated;                  -- narrowed to admins by policy (I3)
-- no INSERT/UPDATE/DELETE on claim_events for any JWT role, service_role included (I4, I5)

-- ============================================================
-- RLS. Every table. Policies are permissive and OR together; each is written to be read in isolation.
-- ============================================================
alter table public.claims       enable row level security;
alter table public.claim_files  enable row level security;
alter table public.claim_notes  enable row level security;
alter table public.claim_events enable row level security;

-- ---------- claims ----------
create policy claims_select_agent on public.claims
  for select to authenticated
  using (agent_id = (select auth.uid()));

create policy claims_select_admin on public.claims
  for select to authenticated
  using ((select public.is_admin()));

-- create own drafts, unassigned. Admins are not excluded (brief: do not hard-block admins on mobile).
create policy claims_insert_agent on public.claims
  for insert to authenticated
  with check (
    agent_id = (select auth.uid())
    and status = 'draft'
    and assigned_to is null
  );

-- edit own claim only while draft / info_requested (USING = old row); may only land on draft, info_requested
-- (edit) or submitted (submit) (WITH CHECK = new row). claims_guard_update narrows to the exact transitions.
create policy claims_update_agent on public.claims
  for update to authenticated
  using (
    agent_id = (select auth.uid())
    and status in ('draft', 'info_requested')
  )
  with check (
    agent_id = (select auth.uid())
    and status in ('draft', 'info_requested', 'submitted')
  );

-- admin: update any claim; transitions narrowed by the guard trigger.
create policy claims_update_admin on public.claims
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- no DELETE policy for anyone.

-- ---------- claim_files ----------
create policy claim_files_select_agent on public.claim_files
  for select to authenticated
  using (exists (
    select 1 from public.claims c
    where c.id = claim_files.claim_id and c.agent_id = (select auth.uid())
  ));

create policy claim_files_select_admin on public.claim_files
  for select to authenticated
  using ((select public.is_admin()));

-- attach and remove only while draft (decision p); uploaded_by must be the caller.
create policy claim_files_insert_agent on public.claim_files
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.claims c
      where c.id = claim_files.claim_id
        and c.agent_id = (select auth.uid())
        and c.status = 'draft'
    )
  );

create policy claim_files_delete_agent on public.claim_files
  for delete to authenticated
  using (exists (
    select 1 from public.claims c
    where c.id = claim_files.claim_id
      and c.agent_id = (select auth.uid())
      and c.status = 'draft'
  ));

-- no admin insert/delete of files; no UPDATE for anyone.

-- ---------- claim_notes ----------
-- I2: the ONLY policy that returns a note to a non-admin carries visibility = 'agent_visible'.
create policy claim_notes_select_agent on public.claim_notes
  for select to authenticated
  using (
    visibility = 'agent_visible'
    and exists (
      select 1 from public.claims c
      where c.id = claim_notes.claim_id and c.agent_id = (select auth.uid())
    )
  );

create policy claim_notes_select_admin on public.claim_notes
  for select to authenticated
  using ((select public.is_admin()));

create policy claim_notes_insert_admin on public.claim_notes
  for insert to authenticated
  with check ((select public.is_admin()) and author_id = (select auth.uid()));

-- no agent insert (agents respond by editing + resubmitting); no UPDATE/DELETE for anyone.

-- ---------- claim_events ----------
-- I3/I4/I5: admins read; nobody inserts/updates/deletes through PostgREST. Triggers write as definer.
create policy claim_events_select_admin on public.claim_events
  for select to authenticated
  using ((select public.is_admin()));
