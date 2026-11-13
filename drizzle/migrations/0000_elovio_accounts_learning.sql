create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name) <= 80),
 daily_goal_minutes integer not null default 15 check (daily_goal_minutes in (5,10,15,20,30)),
 weekly_goal_days integer not null default 5 check (weekly_goal_days between 1 and 7),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy profiles_owner on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create table public.user_language_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 interface_language text not null default 'fi' check (interface_language in ('fi','es','en')),
 native_language text not null default 'fi' check (native_language in ('fi','es','en')),
 learning_language text not null default 'es' check (learning_language in ('fi','es','en')),
 interpretation_source_language text not null default 'es' check (interpretation_source_language in ('fi','es','en')),
 interpretation_target_language text not null default 'fi' check (interpretation_target_language in ('fi','es','en')),
 updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_language_preferences to authenticated;
grant all on public.user_language_preferences to service_role;
alter table public.user_language_preferences enable row level security;
create policy language_preferences_owner on public.user_language_preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create table public.learner_progress (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 schema_version integer not null default 1 check (schema_version = 1),
 progress jsonb not null default '{}'::jsonb check (jsonb_typeof(progress) = 'object' and pg_column_size(progress) <= 65536),
 updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.learner_progress to authenticated;
grant all on public.learner_progress to service_role;
alter table public.learner_progress enable row level security;
create policy learner_progress_owner on public.learner_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.elovio_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.elovio_updated_at();
create trigger preferences_updated before update on public.user_language_preferences for each row execute function public.elovio_updated_at();
create trigger progress_updated before update on public.learner_progress for each row execute function public.elovio_updated_at();
create function public.elovio_new_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.profiles (id) values (new.id) on conflict (id) do nothing; return new; end; $$;
revoke all on function public.elovio_new_user() from public;
create trigger elovio_auth_user_created after insert on auth.users for each row execute function public.elovio_new_user();