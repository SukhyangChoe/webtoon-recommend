begin;

-- One bounded private batch per profile. No answers, vectors or fit scores stored.
create table public.match_daily_selections (
  profile_id uuid primary key references public.match_profiles(profile_id) on delete cascade,
  request_key text not null check (request_key ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  lease_token uuid not null,
  lease_until timestamptz not null,
  selected_items jsonb check (jsonb_typeof(selected_items)='array' and jsonb_array_length(selected_items)<=3),
  computed_at timestamptz
);
alter table public.match_daily_selections enable row level security;
revoke all on public.match_daily_selections from public, anon, authenticated;
grant select, insert, update on public.match_daily_selections to webtoon_runtime;
create policy webtoon_runtime_daily_selection on public.match_daily_selections
  for all to webtoon_runtime using(true) with check(true);

-- O(1) catalog version check on cache hits, instead of loading every work.
-- Conservative invalidation includes metadata/availability, vectors and covers.
create table public.match_daily_catalog_revision (
  singleton boolean primary key default true check(singleton),
  revision bigint not null default 1 check(revision>0)
);
insert into public.match_daily_catalog_revision(singleton) values(true);
alter table public.match_daily_catalog_revision enable row level security;
revoke all on public.match_daily_catalog_revision from public, anon, authenticated;
grant select on public.match_daily_catalog_revision to webtoon_runtime;
create policy webtoon_runtime_daily_catalog_revision on public.match_daily_catalog_revision
  for select to webtoon_runtime using(true);

create function public.bump_daily_catalog_revision() returns trigger
language plpgsql security definer set search_path=pg_catalog as $fn$
begin
  update public.match_daily_catalog_revision set revision=revision+1 where singleton=true;
  return null;
end;
$fn$;
revoke all on function public.bump_daily_catalog_revision() from public, anon, authenticated, webtoon_runtime;
create trigger webtoons_daily_revision after insert or update or delete or truncate on public.webtoons
  for each statement execute function public.bump_daily_catalog_revision();
create trigger webtoon_details_daily_revision after insert or update or delete or truncate on public.webtoon_details
  for each statement execute function public.bump_daily_catalog_revision();

commit;
