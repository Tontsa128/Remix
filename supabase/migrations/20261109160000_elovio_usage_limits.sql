-- Shared, atomic per-user quotas for web and native Elovio API routes.
-- The caller cannot choose or weaken limits; auth.uid() identifies the owner.
create table if not exists public.elovio_usage_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null check (capability in ('tutor', 'translation', 'speech', 'asr')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, capability)
);

alter table public.elovio_usage_limits enable row level security;
revoke all on table public.elovio_usage_limits from anon, authenticated;

create or replace function public.elovio_consume_usage(p_capability text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  v_limit := case p_capability
    when 'tutor' then 12
    when 'translation' then 30
    when 'speech' then 12
    when 'asr' then 6
    else null
  end;

  if v_limit is null then
    raise exception 'unsupported usage capability' using errcode = '22023';
  end if;

  insert into public.elovio_usage_limits as current_limit
    (user_id, capability, window_started_at, request_count, updated_at)
  values
    (v_user_id, p_capability, now(), 1, now())
  on conflict (user_id, capability) do update
    set window_started_at = case
          when current_limit.window_started_at <= now() - interval '60 seconds'
          then now() else current_limit.window_started_at end,
        request_count = case
          when current_limit.window_started_at <= now() - interval '60 seconds'
          then 1 else least(current_limit.request_count + 1, v_limit + 1) end,
        updated_at = now()
  returning request_count into v_count;

  return v_count <= v_limit;
end;
$$;

revoke all on function public.elovio_consume_usage(text) from public, anon;
grant execute on function public.elovio_consume_usage(text) to authenticated;
