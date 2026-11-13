-- Atomic fixed-window rate limit for authenticated AI tutor requests.
create table if not exists public.tutor_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.tutor_rate_limits enable row level security;
revoke all on table public.tutor_rate_limits from anon, authenticated;

create or replace function public.consume_tutor_rate_limit()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.tutor_rate_limits as current_limit
    (user_id, window_started_at, request_count, updated_at)
  values
    (v_user_id, now(), 1, now())
  on conflict (user_id) do update
    set window_started_at = case
          when current_limit.window_started_at <= now() - interval '60 seconds'
          then now() else current_limit.window_started_at end,
        request_count = case
          when current_limit.window_started_at <= now() - interval '60 seconds'
          then 1 else least(current_limit.request_count + 1, 13) end,
        updated_at = now()
  returning request_count into v_count;

  return v_count <= 12;
end;
$$;

revoke all on function public.consume_tutor_rate_limit() from public, anon;
grant execute on function public.consume_tutor_rate_limit() to authenticated;
