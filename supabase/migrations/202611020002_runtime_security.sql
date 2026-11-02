begin;

create table if not exists public.match_api_rate_windows (
  bucket_key text not null,
  window_start timestamptz not null,
  consumed integer not null check (consumed >= 0),
  expires_at timestamptz not null,
  primary key(bucket_key, window_start)
);
create index if not exists match_api_rate_windows_expiry_idx on public.match_api_rate_windows(expires_at);
alter table public.match_api_rate_windows enable row level security;
revoke all on public.match_api_rate_windows from public, anon, authenticated;

-- Group role only. Login credentials are provisioned outside migrations and Git.
do $block$
begin
  if not exists(select 1 from pg_roles where rolname='webtoon_runtime') then
    create role webtoon_runtime nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end;
$block$;
grant usage on schema public to webtoon_runtime;
grant select on public.webtoons, public.webtoon_details to webtoon_runtime;
revoke insert, update, delete, truncate, references, trigger on public.webtoons, public.webtoon_details from webtoon_runtime;
grant execute on function public.webtoon_is_public_safe(jsonb) to webtoon_runtime;
create policy webtoon_runtime_catalog_read on public.webtoons for select to webtoon_runtime using(true);
create policy webtoon_runtime_details_read on public.webtoon_details for select to webtoon_runtime using(true);

-- These user-data writes remain behind the existing server ownership checks.
do $block$
declare item text;
begin
  foreach item in array array[
    'match_profiles','match_taste_snapshots','match_challenges',
    'match_compatibility_results','match_challenge_entries','match_challenge_entry_history',
    'match_analytics_events','match_profile_recommendations','match_profile_recommendation_likes',
    'match_recommendation_comments','match_recommendation_comment_likes','match_api_rate_windows'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to webtoon_runtime',item);
    execute format('create policy webtoon_runtime_server on public.%I for all to webtoon_runtime using(true) with check(true)',item);
  end loop;
end;
$block$;
commit;
