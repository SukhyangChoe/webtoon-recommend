begin;
-- User policy: only the representative edition's isAdult=true blocks access.
-- Missing/false flags are allowed; sexualCore and free-text ratings do not decide.
create or replace function public.webtoon_is_public_safe(data jsonb)
returns boolean language sql immutable parallel safe set search_path=pg_catalog
as $function$
  select lower(btrim(coalesce(data#>>'{metadata,isAdult}',''))) <> 'true';
$function$;
comment on function public.webtoon_is_public_safe(jsonb) is 'Server access gate: only metadata.isAdult=true is restricted. Missing flags are allowed. Catalog records are not rewritten.';
-- Function semantics changed: rebuild the dependent expression index.
reindex index public.webtoons_public_safe_title_idx;
commit;
