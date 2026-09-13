begin;

create table public.match_profiles (
  profile_id uuid primary key,
  anonymous_id uuid not null unique,
  created_at timestamptz not null default now()
);

create table public.match_taste_snapshots (
  snapshot_id uuid primary key,
  profile_id uuid not null references public.match_profiles(profile_id) on delete cascade,
  public_profile_id text not null unique,
  test_version text not null,
  question_set_version text not null,
  profile_result_copy_version text not null,
  completed_at timestamptz not null,
  snapshot_data jsonb not null check (jsonb_typeof(snapshot_data) = 'object'),
  accuracy_feedback text check (
    accuracy_feedback is null or accuracy_feedback in ('almost_exact', 'mostly_right', 'slightly_off', 'very_off')
  ),
  created_at timestamptz not null default now()
);

create index match_taste_snapshots_profile_completed_idx
  on public.match_taste_snapshots(profile_id, completed_at desc);

create table public.match_challenges (
  challenge_id uuid primary key,
  challenge_code text not null unique,
  owner_profile_id uuid not null references public.match_profiles(profile_id) on delete restrict,
  owner_snapshot_id uuid not null references public.match_taste_snapshots(snapshot_id) on delete restrict,
  owner_nickname text not null check (char_length(owner_nickname) between 2 and 20),
  question_set_version text not null,
  compatibility_version text not null,
  status text not null check (status in ('active', 'closed', 'deleted')),
  ranking_visibility text not null check (ranking_visibility in ('public_by_link', 'private')),
  owner_manage_token_hash char(64) not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index match_challenges_one_active_per_owner_idx
  on public.match_challenges(owner_profile_id)
  where status = 'active';

create index match_challenges_code_status_idx
  on public.match_challenges(challenge_code, status);

create table public.match_compatibility_results (
  result_id text primary key,
  challenge_id uuid not null references public.match_challenges(challenge_id) on delete cascade,
  owner_snapshot_id uuid not null references public.match_taste_snapshots(snapshot_id) on delete restrict,
  challenger_snapshot_id uuid not null references public.match_taste_snapshots(snapshot_id) on delete restrict,
  compatibility_version text not null,
  overall_score integer not null check (overall_score between 0 and 100),
  band jsonb not null check (jsonb_typeof(band) = 'object'),
  component_scores_private jsonb not null check (jsonb_typeof(component_scores_private) = 'object'),
  owner_to_challenger_trust_private double precision not null,
  challenger_to_owner_trust_private double precision not null,
  shared_genres jsonb not null check (jsonb_typeof(shared_genres) = 'array'),
  different_genres jsonb not null check (jsonb_typeof(different_genres) = 'array'),
  shared_taste_labels jsonb not null check (jsonb_typeof(shared_taste_labels) = 'array'),
  trust_sentence text not null,
  created_at timestamptz not null default now()
);

create index match_compatibility_results_challenge_created_idx
  on public.match_compatibility_results(challenge_id, created_at desc);

create table public.match_challenge_entries (
  entry_id uuid primary key,
  challenge_id uuid not null references public.match_challenges(challenge_id) on delete cascade,
  challenger_profile_id uuid not null references public.match_profiles(profile_id) on delete cascade,
  challenger_snapshot_id uuid not null references public.match_taste_snapshots(snapshot_id) on delete restrict,
  result_id text not null references public.match_compatibility_results(result_id) on delete restrict,
  challenger_nickname text not null check (char_length(challenger_nickname) between 2 and 20),
  score integer not null check (score between 0 and 100),
  hidden_by_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, challenger_profile_id)
);

create index match_challenge_entries_ranking_idx
  on public.match_challenge_entries(challenge_id, hidden_by_owner, score desc, created_at asc);

create table public.match_challenge_entry_history (
  history_id uuid primary key,
  entry_id uuid not null references public.match_challenge_entries(entry_id) on delete cascade,
  challenger_snapshot_id uuid not null references public.match_taste_snapshots(snapshot_id) on delete restrict,
  result_id text not null references public.match_compatibility_results(result_id) on delete restrict,
  score integer not null check (score between 0 and 100),
  recorded_at timestamptz not null
);

create index match_challenge_entry_history_entry_idx
  on public.match_challenge_entry_history(entry_id, recorded_at desc);

alter table public.match_profiles enable row level security;
alter table public.match_taste_snapshots enable row level security;
alter table public.match_challenges enable row level security;
alter table public.match_compatibility_results enable row level security;
alter table public.match_challenge_entries enable row level security;
alter table public.match_challenge_entry_history enable row level security;

revoke all on table public.match_profiles from anon, authenticated;
revoke all on table public.match_taste_snapshots from anon, authenticated;
revoke all on table public.match_challenges from anon, authenticated;
revoke all on table public.match_compatibility_results from anon, authenticated;
revoke all on table public.match_challenge_entries from anon, authenticated;
revoke all on table public.match_challenge_entry_history from anon, authenticated;

commit;
