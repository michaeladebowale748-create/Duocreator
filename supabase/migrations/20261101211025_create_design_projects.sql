create table public.design_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_key text not null,
  name text not null check (char_length(name) between 1 and 160),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_projects_document_is_object
    check (jsonb_typeof(document) = 'object'),
  constraint design_projects_document_id_matches_key
    check (document ->> 'id' = project_key),
  constraint design_projects_owner_project_key_key
    unique (owner_id, project_key)
);

create index design_projects_owner_updated_at_idx
  on public.design_projects (owner_id, updated_at desc);

alter table public.design_projects enable row level security;

create policy "Users can read their own design projects"
  on public.design_projects
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own design projects"
  on public.design_projects
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own design projects"
  on public.design_projects
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own design projects"
  on public.design_projects
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.design_projects to authenticated;
revoke all on table public.design_projects from anon;
