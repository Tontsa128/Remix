create table public.elovio_provider_usage (
 user_id uuid not null references public.profiles(id) on delete cascade,
 capability text not null check (capability in ('tutor','translation','speech','asr')),
 window_started_at timestamptz not null, request_count integer not null default 0,
 primary key (user_id, capability)
);
grant all on public.elovio_provider_usage to service_role;
revoke all on public.elovio_provider_usage from anon, authenticated;
alter table public.elovio_provider_usage enable row level security;
create function public.elovio_consume_usage(p_capability text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_limit integer; v_count integer;
begin
 if v_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
 v_limit := case p_capability when 'tutor' then 12 when 'translation' then 30 when 'speech' then 12 when 'asr' then 6 else null end;
 if v_limit is null then raise exception 'invalid capability'; end if;
 insert into public.elovio_provider_usage as usage (user_id,capability,window_started_at,request_count) values (v_user,p_capability,now(),1)
 on conflict (user_id,capability) do update set
 window_started_at = case when usage.window_started_at <= now() - interval '60 seconds' then now() else usage.window_started_at end,
 request_count = case when usage.window_started_at <= now() - interval '60 seconds' then 1 else least(usage.request_count + 1,v_limit + 1) end
 returning request_count into v_count;
 return v_count <= v_limit;
end; $$;
revoke all on function public.elovio_consume_usage(text) from public, anon;
grant execute on function public.elovio_consume_usage(text) to authenticated;
create function public.consume_tutor_rate_limit() returns boolean language sql security invoker set search_path = '' as $$ select public.elovio_consume_usage('tutor'); $$;
create function public.consume_interpreter_translation_limit() returns boolean language sql security invoker set search_path = '' as $$ select public.elovio_consume_usage('translation'); $$;
create function public.consume_interpreter_speech_limit() returns boolean language sql security invoker set search_path = '' as $$ select public.elovio_consume_usage('speech'); $$;
create function public.consume_interpreter_asr_session_limit() returns boolean language sql security invoker set search_path = '' as $$ select public.elovio_consume_usage('asr'); $$;
revoke all on function public.consume_tutor_rate_limit(), public.consume_interpreter_translation_limit(), public.consume_interpreter_speech_limit(), public.consume_interpreter_asr_session_limit() from public, anon;
grant execute on function public.consume_tutor_rate_limit(), public.consume_interpreter_translation_limit(), public.consume_interpreter_speech_limit(), public.consume_interpreter_asr_session_limit() to authenticated;