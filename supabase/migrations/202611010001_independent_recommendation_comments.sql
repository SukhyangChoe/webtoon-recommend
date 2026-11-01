begin;

-- Membership/order stays in match_profile_recommendations. A comment belongs to
-- its author and work, NOT to the current ten-work recommendation list.
create table if not exists public.match_recommendation_comments (
  comment_id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references public.match_profiles(profile_id) on delete cascade,
  canonical_webtoon_id text not null references public.webtoons(canonical_webtoon_id) on delete restrict,
  body text not null check (body = btrim(body) and char_length(body) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (comment_id, author_profile_id)
);
create unique index if not exists match_recommendation_comments_author_work_active_idx
  on public.match_recommendation_comments(author_profile_id, canonical_webtoon_id) where deleted_at is null;
create index if not exists match_recommendation_comments_work_active_idx
  on public.match_recommendation_comments(canonical_webtoon_id, created_at desc, comment_id) where deleted_at is null;

create table if not exists public.match_recommendation_comment_likes (
  comment_id uuid not null,
  author_profile_id uuid not null,
  liker_profile_id uuid not null references public.match_profiles(profile_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, liker_profile_id),
  foreign key (comment_id, author_profile_id)
    references public.match_recommendation_comments(comment_id, author_profile_id) on delete cascade,
  check (author_profile_id <> liker_profile_id)
);
create index if not exists match_recommendation_comment_likes_liker_idx
  on public.match_recommendation_comment_likes(liker_profile_id, created_at desc);
alter table public.match_recommendation_comments enable row level security;
alter table public.match_recommendation_comment_likes enable row level security;
revoke all on table public.match_recommendation_comments from anon, authenticated;
revoke all on table public.match_recommendation_comment_likes from anon, authenticated;

-- Backfill without deleting or rewriting the old data. Old likes on works with
-- no comment remain in the old table; they are not reassigned to invented text.
lock table public.match_profile_recommendations, public.match_profile_recommendation_likes in share row exclusive mode;
insert into public.match_recommendation_comments(author_profile_id, canonical_webtoon_id, body, created_at, updated_at)
select profile_id, canonical_webtoon_id, recommendation_comment, created_at, updated_at
from public.match_profile_recommendations where recommendation_comment is not null
on conflict (author_profile_id, canonical_webtoon_id) where deleted_at is null do nothing;
insert into public.match_recommendation_comment_likes(comment_id, author_profile_id, liker_profile_id, created_at)
select c.comment_id, c.author_profile_id, l.liker_profile_id, l.created_at
from public.match_profile_recommendation_likes l
join public.match_recommendation_comments c
  on c.author_profile_id = l.recommender_profile_id and c.canonical_webtoon_id = l.canonical_webtoon_id
where c.deleted_at is null
on conflict do nothing;

-- Keep older application versions compatible during rollout. Deleting a list
-- entry deliberately has NO comment-deletion trigger.
create or replace function public.sync_recommendation_comment_legacy_write()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if TG_OP = 'INSERT' and NEW.recommendation_comment is null then
    select body into NEW.recommendation_comment from public.match_recommendation_comments
    where author_profile_id = NEW.profile_id and canonical_webtoon_id = NEW.canonical_webtoon_id and deleted_at is null;
  end if;
  if NEW.recommendation_comment is not null then
    insert into public.match_recommendation_comments(author_profile_id, canonical_webtoon_id, body)
    values (NEW.profile_id, NEW.canonical_webtoon_id, NEW.recommendation_comment)
    on conflict (author_profile_id, canonical_webtoon_id) where deleted_at is null do update
      set body = excluded.body, updated_at = now()
      where match_recommendation_comments.body is distinct from excluded.body;
  elsif TG_OP = 'UPDATE' and OLD.recommendation_comment is not null then
    update public.match_recommendation_comments set deleted_at = now(), updated_at = now()
    where author_profile_id = NEW.profile_id and canonical_webtoon_id = NEW.canonical_webtoon_id and deleted_at is null;
  end if;
  return NEW;
end $$;
drop trigger if exists match_recommendation_comment_legacy_write on public.match_profile_recommendations;
create trigger match_recommendation_comment_legacy_write
before insert or update of recommendation_comment on public.match_profile_recommendations
for each row execute function public.sync_recommendation_comment_legacy_write();

create or replace function public.sync_recommendation_comment_legacy_like()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare target_comment uuid;
begin
  if TG_OP = 'INSERT' then
    select comment_id into target_comment from public.match_recommendation_comments
    where author_profile_id = NEW.recommender_profile_id and canonical_webtoon_id = NEW.canonical_webtoon_id and deleted_at is null;
    if target_comment is not null then
      insert into public.match_recommendation_comment_likes(comment_id, author_profile_id, liker_profile_id, created_at)
      values (target_comment, NEW.recommender_profile_id, NEW.liker_profile_id, NEW.created_at) on conflict do nothing;
    end if;
    return NEW;
  end if;
  -- A cascaded removal caused by list membership deletion must preserve likes.
  if exists (select 1 from public.match_profile_recommendations
    where profile_id = OLD.recommender_profile_id and canonical_webtoon_id = OLD.canonical_webtoon_id) then
    delete from public.match_recommendation_comment_likes l using public.match_recommendation_comments c
    where l.comment_id = c.comment_id and c.author_profile_id = OLD.recommender_profile_id
      and c.canonical_webtoon_id = OLD.canonical_webtoon_id and c.deleted_at is null
      and l.liker_profile_id = OLD.liker_profile_id;
  end if;
  return OLD;
end $$;
drop trigger if exists match_recommendation_comment_legacy_like on public.match_profile_recommendation_likes;
create trigger match_recommendation_comment_legacy_like after insert or delete on public.match_profile_recommendation_likes
for each row execute function public.sync_recommendation_comment_legacy_like();
revoke all on function public.sync_recommendation_comment_legacy_write() from public, anon, authenticated;
revoke all on function public.sync_recommendation_comment_legacy_like() from public, anon, authenticated;

commit;
