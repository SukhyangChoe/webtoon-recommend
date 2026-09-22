begin;

-- A profile can have legacy owner and challenger rows for the same link after
-- browser data was cleared during testing. Those rows represent one person and
-- must not block that person's own nickname update.
create or replace function public.enforce_match_challenge_nickname_conflict()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'match_challenge_entries' then
    if exists (
      select 1
      from public.match_challenges challenges
      where challenges.challenge_id = new.challenge_id
        and challenges.owner_profile_id <> new.challenger_profile_id
        and public.match_nickname_key(challenges.owner_nickname) = public.match_nickname_key(new.challenger_nickname)
    ) then
      raise exception using message = 'Nickname already used by the challenge owner', errcode = '23505', constraint = 'match_challenge_nickname_owner_conflict';
    end if;
  elsif tg_table_name = 'match_challenges' and new.owner_nickname is distinct from old.owner_nickname then
    if exists (
      select 1
      from public.match_challenge_entries entries
      where entries.challenge_id = new.challenge_id
        and entries.challenger_profile_id <> new.owner_profile_id
        and public.match_nickname_key(entries.challenger_nickname) = public.match_nickname_key(new.owner_nickname)
    ) then
      raise exception using message = 'Nickname already used by a challenge entry', errcode = '23505', constraint = 'match_challenge_nickname_owner_conflict';
    end if;
  end if;
  return new;
end
$$;

commit;
