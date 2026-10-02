begin;

alter table public.match_profile_recommendations
  add column if not exists recommendation_comment text;

alter table public.match_profile_recommendations
  drop constraint if exists match_profile_recommendations_comment_length;

alter table public.match_profile_recommendations
  add constraint match_profile_recommendations_comment_length check (
    recommendation_comment is null
    or (
      recommendation_comment = btrim(recommendation_comment)
      and char_length(recommendation_comment) between 1 and 80
    )
  );

-- 순서를 서로 바꿀 때도 기존 추천 행과 좋아요를 보존할 수 있게 한다.
alter table public.match_profile_recommendations
  drop constraint if exists match_profile_recommendations_profile_id_sort_order_key;

alter table public.match_profile_recommendations
  add constraint match_profile_recommendations_profile_sort_order_unique
  unique (profile_id, sort_order)
  deferrable initially deferred;

create table public.match_profile_recommendation_likes (
  recommender_profile_id uuid not null,
  canonical_webtoon_id text not null,
  liker_profile_id uuid not null references public.match_profiles(profile_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recommender_profile_id, canonical_webtoon_id, liker_profile_id),
  constraint match_profile_recommendation_likes_recommendation_fk
    foreign key (recommender_profile_id, canonical_webtoon_id)
    references public.match_profile_recommendations(profile_id, canonical_webtoon_id)
    on delete cascade,
  constraint match_profile_recommendation_likes_no_self check (
    recommender_profile_id <> liker_profile_id
  )
);

create index match_profile_recommendation_likes_liker_idx
  on public.match_profile_recommendation_likes(liker_profile_id, created_at desc);

alter table public.match_profile_recommendation_likes enable row level security;
revoke all on table public.match_profile_recommendation_likes from anon, authenticated;

commit;
