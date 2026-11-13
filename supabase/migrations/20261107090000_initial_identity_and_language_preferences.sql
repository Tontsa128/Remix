-- Elovio initial identity and language preference schema.
-- Apply only to a provisioned Supabase project after reviewing the migration.

create extension if not exists pgcrypto;

create table if not exists public.languages (
  code text primary key,
  native_name text not null,
  english_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint languages_code_format check (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$')
);

insert into public.languages (code, native_name, english_name)
values
  ('fi', 'Suomi', 'Finnish'),
  ('es', 'Español', 'Spanish'),
  ('en', 'English', 'English')
on conflict (code) do update
set native_name = excluded.native_name,
    english_name = excluded.english_name;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_language_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interface_language text not null default 'fi' references public.languages(code),
  native_language text not null default 'fi' references public.languages(code),
  learning_language text not null default 'es' references public.languages(code),
  interpretation_source_language text not null default 'es' references public.languages(code),
  interpretation_target_language text not null default 'fi' references public.languages(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_language_preferences_learning_language_idx
  on public.user_language_preferences (learning_language);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_language_preferences_set_updated_at
  on public.user_language_preferences;
create trigger user_language_preferences_set_updated_at
before update on public.user_language_preferences
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_language_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.languages enable row level security;
alter table public.profiles enable row level security;
alter table public.user_language_preferences enable row level security;

-- Language definitions are public reference data; clients may read active rows.
drop policy if exists "Anyone can read active languages" on public.languages;
create policy "Anyone can read active languages"
on public.languages for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own language preferences"
  on public.user_language_preferences;
create policy "Users can read their own language preferences"
on public.user_language_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own language preferences"
  on public.user_language_preferences;
create policy "Users can insert their own language preferences"
on public.user_language_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own language preferences"
  on public.user_language_preferences;
create policy "Users can update their own language preferences"
on public.user_language_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Explicit least-privilege table grants for Supabase client roles.
grant select on table public.languages to anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_language_preferences to authenticated;

-- No DELETE privileges or policies are granted to client roles. Deleting the
-- auth user cascades to owned rows. Language reference data is read-only.
