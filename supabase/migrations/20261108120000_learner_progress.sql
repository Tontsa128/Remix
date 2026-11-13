-- Per-user learning progress snapshot. Only the authenticated owner may
-- read or change their own row. Client payloads are validated and bounded in app code.
create table if not exists public.learner_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_progress_payload_object check (jsonb_typeof(progress) = 'object'),
  constraint learner_progress_payload_size check (pg_column_size(progress) <= 65536)
);

drop trigger if exists learner_progress_set_updated_at on public.learner_progress;
create trigger learner_progress_set_updated_at
before update on public.learner_progress
for each row execute function public.set_updated_at();

alter table public.learner_progress enable row level security;

drop policy if exists "Users can read their own learning progress" on public.learner_progress;
create policy "Users can read their own learning progress"
on public.learner_progress for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own learning progress" on public.learner_progress;
create policy "Users can insert their own learning progress"
on public.learner_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own learning progress" on public.learner_progress;
create policy "Users can update their own learning progress"
on public.learner_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.learner_progress to authenticated;
