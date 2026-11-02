begin;
-- SELECT ... FOR SHARE requires UPDATE privilege in PostgreSQL. Expose only
-- this bounded validation/locking operation; never grant catalog writes to app.
create or replace function public.lock_recommendation_catalog(ids text[])
returns table(canonical_webtoon_id text,title text,platform text,official_url text,main_genre text,recommendation_registration_blocked boolean)
language sql volatile security definer set search_path=pg_catalog
as $function$
  select w.canonical_webtoon_id,w.title,w.platform,w.official_url,w.main_genre,
    not public.webtoon_is_public_safe(w.raw_data)
  from public.webtoons w
  where cardinality(ids) between 1 and 10
    and w.canonical_webtoon_id=any(ids)
    and w.catalog_status='active' and w.recommendation_eligible=true
  for share of w;
$function$;
revoke all on function public.lock_recommendation_catalog(text[]) from public,anon,authenticated;
grant execute on function public.lock_recommendation_catalog(text[]) to webtoon_runtime;
create index if not exists webtoons_public_safe_title_idx on public.webtoons(normalized_title)
  where catalog_status='active' and public.webtoon_is_public_safe(raw_data);
commit;
