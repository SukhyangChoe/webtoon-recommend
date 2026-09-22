begin;

-- A challenge owner must never appear as a challenger in their own ranking.
-- Remove legacy self-comparisons created while the invite owner token was absent.
create temporary table match_self_entries_to_remove on commit drop as
select entries.entry_id, entries.result_id
from public.match_challenge_entries entries
join public.match_challenges challenges on challenges.challenge_id = entries.challenge_id
where entries.challenger_profile_id = challenges.owner_profile_id;

delete from public.match_challenge_entries entries
using match_self_entries_to_remove invalid
where entries.entry_id = invalid.entry_id;

delete from public.match_compatibility_results results
using match_self_entries_to_remove invalid
where results.result_id = invalid.result_id
  and not exists (
    select 1
    from public.match_challenge_entries entries
    where entries.result_id = results.result_id
  );

create or replace function public.enforce_no_self_challenge_entry()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.match_challenges challenges
    where challenges.challenge_id = new.challenge_id
      and challenges.owner_profile_id = new.challenger_profile_id
  ) then
    raise exception using message = 'Challenge owners cannot enter their own challenge', errcode = '23514', constraint = 'match_challenge_self_entry_forbidden';
  end if;
  return new;
end
$$;

drop trigger if exists match_challenge_no_self_entry on public.match_challenge_entries;
create trigger match_challenge_no_self_entry
before insert or update of challenge_id, challenger_profile_id on public.match_challenge_entries
for each row execute function public.enforce_no_self_challenge_entry();

commit;
