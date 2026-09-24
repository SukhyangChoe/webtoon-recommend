begin;

drop trigger if exists match_challenge_entry_nickname_conflict
  on public.match_challenge_entries;

drop trigger if exists match_challenge_owner_nickname_conflict
  on public.match_challenges;

drop index if exists public.match_challenge_entries_unique_nickname_idx;
drop function if exists public.enforce_match_challenge_nickname_conflict();

-- Keep match_nickname_key(text) temporarily for compatibility with the
-- previously deployed application while the new code is rolling out.

commit;
