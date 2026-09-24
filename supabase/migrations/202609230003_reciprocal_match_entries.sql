begin;

alter table public.match_challenge_entries
  add column if not exists entry_origin text not null default 'direct'
    check (entry_origin in ('direct', 'reciprocal')),
  add column if not exists source_result_id text
    references public.match_compatibility_results(result_id) on delete set null;

create index if not exists match_challenge_entries_origin_idx
  on public.match_challenge_entries(challenge_id, entry_origin);

commit;
