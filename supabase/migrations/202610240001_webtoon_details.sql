begin;

-- Source imports update imported_data only. Editorial fields are independently
-- maintained, so a new seed cannot erase a curated cover, synopsis or credit.
create table public.webtoon_details (
  canonical_webtoon_id text primary key references public.webtoons(canonical_webtoon_id) on delete restrict,
  cover_url text check (cover_url is null or char_length(cover_url) between 1 and 2048),
  synopsis text check (synopsis is null or char_length(synopsis) between 1 and 10000),
  synopsis_kind text not null default 'editorial' check (synopsis_kind in ('official', 'editorial')),
  creators jsonb not null default '[]'::jsonb check (jsonb_typeof(creators) = 'array'),
  source_refs jsonb not null default '{}'::jsonb check (jsonb_typeof(source_refs) = 'object'),
  imported_data jsonb not null default '{}'::jsonb check (jsonb_typeof(imported_data) = 'object'),
  schema_version text not null default '1',
  updated_at timestamptz not null default now()
);

alter table public.webtoon_details enable row level security;
revoke all on table public.webtoon_details from anon, authenticated;

comment on table public.webtoon_details is 'Server-only work presentation; independent of user recommendations and seed vector data';

commit;
