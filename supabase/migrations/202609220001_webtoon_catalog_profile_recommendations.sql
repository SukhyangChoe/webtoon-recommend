begin;

create extension if not exists pg_trgm;

alter table public.match_profiles
  add column if not exists display_name text
  check (display_name is null or char_length(display_name) between 2 and 20);

update public.match_profiles profiles
set display_name = coalesce(
  (
    select challenges.owner_nickname
    from public.match_challenges challenges
    where challenges.owner_profile_id = profiles.profile_id
    order by challenges.created_at desc
    limit 1
  ),
  (
    select entries.challenger_nickname
    from public.match_challenge_entries entries
    where entries.challenger_profile_id = profiles.profile_id
    order by entries.updated_at desc
    limit 1
  )
)
where profiles.display_name is null;

create or replace function public.match_nickname_key(value text)
returns text
language sql
immutable
strict
as $$
  select lower(regexp_replace(btrim(value), '\s+', ' ', 'g'))
$$;

-- Older links allowed duplicate display names. Preserve every entry and make only
-- the conflicting legacy names distinct before the new unique index is created.
-- The first challenger keeps the original name unless it conflicts with the owner.
do $$
declare
  conflicting_entry record;
  suffix text;
  candidate text;
  suffix_number integer;
begin
  for conflicting_entry in
    with ranked_entries as (
      select
        entries.entry_id,
        entries.challenge_id,
        entries.challenger_nickname,
        row_number() over (
          partition by entries.challenge_id, public.match_nickname_key(entries.challenger_nickname)
          order by entries.created_at, entries.entry_id
        ) as duplicate_number,
        (
          entries.challenger_profile_id <> challenges.owner_profile_id
          and public.match_nickname_key(entries.challenger_nickname) = public.match_nickname_key(challenges.owner_nickname)
        ) as conflicts_with_owner
      from public.match_challenge_entries entries
      join public.match_challenges challenges on challenges.challenge_id = entries.challenge_id
    )
    select *
    from ranked_entries
    where duplicate_number > 1 or conflicts_with_owner
    order by challenge_id, duplicate_number, entry_id
  loop
    suffix_number := 2;
    loop
      suffix := ' ' || suffix_number::text;
      candidate := left(btrim(conflicting_entry.challenger_nickname), 20 - char_length(suffix)) || suffix;

      exit when not exists (
        select 1
        from public.match_challenges challenges
        where challenges.challenge_id = conflicting_entry.challenge_id
          and public.match_nickname_key(challenges.owner_nickname) = public.match_nickname_key(candidate)
      ) and not exists (
        select 1
        from public.match_challenge_entries entries
        where entries.challenge_id = conflicting_entry.challenge_id
          and entries.entry_id <> conflicting_entry.entry_id
          and public.match_nickname_key(entries.challenger_nickname) = public.match_nickname_key(candidate)
      );

      suffix_number := suffix_number + 1;
    end loop;

    update public.match_challenge_entries
    set challenger_nickname = candidate,
        updated_at = now()
    where entry_id = conflicting_entry.entry_id;
  end loop;
end
$$;

create unique index if not exists match_challenge_entries_unique_nickname_idx
  on public.match_challenge_entries (challenge_id, public.match_nickname_key(challenger_nickname));

create or replace function public.enforce_match_challenge_nickname_conflict()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'match_challenge_entries' then
    if exists (
      select 1
      from public.match_challenges challenges
      where challenges.challenge_id = new.challenge_id
        and challenges.owner_profile_id <> new.challenger_profile_id
        and public.match_nickname_key(challenges.owner_nickname) = public.match_nickname_key(new.challenger_nickname)
    ) then
      raise exception using message = 'Nickname already used by the challenge owner', errcode = '23505', constraint = 'match_challenge_nickname_owner_conflict';
    end if;
  elsif tg_table_name = 'match_challenges' and new.owner_nickname is distinct from old.owner_nickname then
    if exists (
      select 1
      from public.match_challenge_entries entries
      where entries.challenge_id = new.challenge_id
        and entries.challenger_profile_id <> new.owner_profile_id
        and public.match_nickname_key(entries.challenger_nickname) = public.match_nickname_key(new.owner_nickname)
    ) then
      raise exception using message = 'Nickname already used by a challenge entry', errcode = '23505', constraint = 'match_challenge_nickname_owner_conflict';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists match_challenge_entry_nickname_conflict on public.match_challenge_entries;
create trigger match_challenge_entry_nickname_conflict
before insert or update of challenger_nickname on public.match_challenge_entries
for each row execute function public.enforce_match_challenge_nickname_conflict();

drop trigger if exists match_challenge_owner_nickname_conflict on public.match_challenges;
create trigger match_challenge_owner_nickname_conflict
before update of owner_nickname on public.match_challenges
for each row execute function public.enforce_match_challenge_nickname_conflict();

create table public.webtoons (
  canonical_webtoon_id text primary key,
  title text not null check (char_length(btrim(title)) > 0),
  normalized_title text not null check (char_length(btrim(normalized_title)) > 0),
  platform text not null check (char_length(btrim(platform)) > 0),
  official_url text,
  main_genre text not null check (char_length(btrim(main_genre)) > 0),
  recommendation_eligible boolean not null default true,
  catalog_status text not null default 'active' check (catalog_status in ('active', 'hidden', 'retired')),
  raw_data jsonb not null check (jsonb_typeof(raw_data) = 'object'),
  catalog_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index webtoons_normalized_title_idx on public.webtoons(normalized_title);
create index webtoons_title_trgm_idx on public.webtoons using gin (normalized_title gin_trgm_ops);
create index webtoons_catalog_filter_idx on public.webtoons(catalog_status, recommendation_eligible, main_genre);

create table public.match_profile_recommendations (
  profile_id uuid not null references public.match_profiles(profile_id) on delete cascade,
  canonical_webtoon_id text not null references public.webtoons(canonical_webtoon_id) on delete restrict,
  sort_order smallint not null check (sort_order between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, canonical_webtoon_id),
  unique (profile_id, sort_order)
);

alter table public.webtoons enable row level security;
alter table public.match_profile_recommendations enable row level security;
revoke all on table public.webtoons from anon, authenticated;
revoke all on table public.match_profile_recommendations from anon, authenticated;

commit;
