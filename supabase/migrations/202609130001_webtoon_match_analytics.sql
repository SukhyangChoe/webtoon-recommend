begin;

create table public.match_analytics_events (
  event_id uuid primary key,
  anonymous_id uuid not null,
  event_name text not null check (event_name in (
    'wm_landing_view',
    'wm_challenge_landing_view',
    'wm_test_start',
    'wm_section_view',
    'wm_answer_select',
    'wm_test_complete',
    'wm_result_view',
    'wm_challenge_create',
    'wm_share_intent_click',
    'wm_share_fallback',
    'wm_pair_result_view',
    'wm_ranking_view',
    'wm_ranking_share_click',
    'wm_accuracy_feedback',
    'wm_owner_hide_entry'
  )),
  event_version text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object')
);

create index match_analytics_events_name_occurred_idx
  on public.match_analytics_events(event_name, occurred_at desc);

create index match_analytics_events_anonymous_occurred_idx
  on public.match_analytics_events(anonymous_id, occurred_at desc);

create index match_analytics_events_challenge_idx
  on public.match_analytics_events((properties ->> 'challengeCode'), occurred_at desc)
  where properties ? 'challengeCode';

alter table public.match_analytics_events enable row level security;
revoke all on table public.match_analytics_events from anon, authenticated;

create view public.match_pilot_daily_funnel
with (security_invoker = true) as
select
  occurred_at::date as metric_date,
  count(distinct anonymous_id) filter (where event_name = 'wm_landing_view') as landing_visitors,
  count(distinct anonymous_id) filter (where event_name = 'wm_test_start') as test_starters,
  count(distinct anonymous_id) filter (where event_name = 'wm_test_complete') as test_completers,
  count(distinct anonymous_id) filter (where event_name = 'wm_result_view') as result_viewers,
  count(distinct anonymous_id) filter (where event_name = 'wm_challenge_create') as challenge_creators,
  count(distinct anonymous_id) filter (where event_name = 'wm_share_intent_click') as share_intent_users,
  round(
    100.0 * count(distinct anonymous_id) filter (where event_name = 'wm_test_complete')
    / nullif(count(distinct anonymous_id) filter (where event_name = 'wm_test_start'), 0),
    1
  ) as completion_rate_percent,
  round(
    avg((properties ->> 'durationMs')::numeric) filter (where event_name = 'wm_test_complete') / 1000.0,
    1
  ) as average_completion_seconds
from public.match_analytics_events
group by occurred_at::date;

create view public.match_pilot_section_metrics
with (security_invoker = true) as
select
  properties ->> 'sectionKey' as section_key,
  count(*) as section_views,
  count(distinct anonymous_id) as unique_visitors,
  round(avg((properties ->> 'elapsedMs')::numeric) / 1000.0, 1) as average_elapsed_seconds
from public.match_analytics_events
where event_name = 'wm_section_view'
  and properties ? 'sectionKey'
group by properties ->> 'sectionKey';

create view public.match_pilot_choice_distribution
with (security_invoker = true) as
select
  properties ->> 'questionId' as question_id,
  properties ->> 'choiceKey' as choice_key,
  properties ->> 'selectionRole' as selection_role,
  count(*) as selection_count,
  count(distinct anonymous_id) as unique_selectors
from public.match_analytics_events
where event_name = 'wm_answer_select'
  and properties ? 'questionId'
  and properties ? 'choiceKey'
  and coalesce((properties ->> 'selected')::boolean, true)
group by
  properties ->> 'questionId',
  properties ->> 'choiceKey',
  properties ->> 'selectionRole';

create view public.match_pilot_result_distribution
with (security_invoker = true) as
select
  properties ->> 'topGenre' as top_genre,
  (properties ->> 'starConcentration')::integer as star_concentration,
  (properties ->> 'settingSelectionCount')::integer as setting_selection_count,
  coalesce((properties ->> 'settingIndifferent')::boolean, false) as setting_indifferent,
  count(*) as result_count
from public.match_analytics_events
where event_name = 'wm_test_complete'
group by
  properties ->> 'topGenre',
  (properties ->> 'starConcentration')::integer,
  (properties ->> 'settingSelectionCount')::integer,
  coalesce((properties ->> 'settingIndifferent')::boolean, false);

create view public.match_pilot_accuracy_feedback
with (security_invoker = true) as
select
  properties ->> 'rating' as rating,
  count(*) as response_count,
  count(distinct anonymous_id) as unique_respondents
from public.match_analytics_events
where event_name = 'wm_accuracy_feedback'
  and properties ? 'rating'
group by properties ->> 'rating';

revoke all on table
  public.match_pilot_daily_funnel,
  public.match_pilot_section_metrics,
  public.match_pilot_choice_distribution,
  public.match_pilot_result_distribution,
  public.match_pilot_accuracy_feedback
from anon, authenticated;

commit;
