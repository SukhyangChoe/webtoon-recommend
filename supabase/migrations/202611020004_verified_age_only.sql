begin;
-- isAdult=false inferred from an absent badge is not a verified age rating.
create or replace function public.webtoon_is_public_safe(data jsonb)
returns boolean language sql immutable parallel safe set search_path=pg_catalog
as $function$
  select lower(coalesce(data#>>'{metadata,sexualCore}','false')) <> 'true'
    and lower(coalesce(data#>>'{metadata,isAdult}','false')) <> 'true'
    and not exists (
      select 1 from unnest(array[data#>>'{metadata,ageRating}',data#>>'{metadata,ageRatingRaw}']) r(rating)
      where regexp_replace(lower(coalesce(rating,'')), '(성인|19세|18세)[[:space:]]*표시[[:space:]]*없음','','g')
        ~ '(18|19|성인|청소년[^가-힣]*이용[^가-힣]*불가|청소년관람불가|adult|mature)'
    )
    and exists (
      select 1 from unnest(array[data#>>'{metadata,ageRating}',data#>>'{metadata,ageRatingRaw}']) r(rating)
      where regexp_replace(lower(coalesce(rating,'')), '[[:space:]]','','g')
        ~ '^(전체(연령|이용)?가?|전체이용가|전체연령가|일반이용가|allages|all|0|7|12|15|7세(이용가|이상)?|12세(이용가|이상)?|15세(이용가|이상)?)$'
    );
$function$;
-- Rebuild expression-dependent index after changing an immutable function.
reindex index public.webtoons_public_safe_title_idx;
commit;
