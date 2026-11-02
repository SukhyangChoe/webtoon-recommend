begin;

-- Scope is the representative edition. A separate adult sibling edition must
-- not accidentally classify an independently verified 15+ revision as adult.
create or replace function public.webtoon_is_public_safe(data jsonb)
returns boolean language sql immutable parallel safe
set search_path = pg_catalog
as $function$
  select
    lower(coalesce(data#>>'{metadata,sexualCore}', 'false')) <> 'true'
    and lower(coalesce(data#>>'{metadata,isAdult}', 'false')) <> 'true'
    and not exists (
      select 1 from unnest(array[data#>>'{metadata,ageRating}', data#>>'{metadata,ageRatingRaw}']) as r(rating)
      where coalesce(rating,'') ~* '(18|19|성인|청소년[^가-힣]*이용[^가-힣]*불가|청소년관람불가|adult|mature)'
    )
    and (
      lower(data#>>'{metadata,isAdult}') = 'false'
      or exists (
        select 1 from unnest(array[data#>>'{metadata,ageRating}', data#>>'{metadata,ageRatingRaw}']) as r(rating)
        where regexp_replace(lower(coalesce(rating,'')), '[[:space:]]', '', 'g')
          ~ '^(전체(연령|이용)?가?|전체이용가|전체연령가|일반이용가|allages|all|0|7|12|15|7세(이용가|이상)?|12세(이용가|이상)?|15세(이용가|이상)?)$'
      )
    ) is true;
$function$;

revoke all on function public.webtoon_is_public_safe(jsonb) from public, anon, authenticated;
comment on function public.webtoon_is_public_safe(jsonb) is 'Shared server-only access gate. Unknown/conflicting representative edition age stays unavailable. No catalog values are rewritten.';
commit;
