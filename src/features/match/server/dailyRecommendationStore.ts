import 'server-only';
import questionSeed from '../data/questionSeed.v0.4.json';
import { getMatchDatabase } from './database';
import { runtime02Available, selectDailyRuntime02 } from './dailyRecommendation/runtime02.mjs';
import { DAILY_SELECTION_VERSION, dailyWindow } from './dailyRecommendation/policy.mjs';
import { recommendationGenreLabel, safeWorkCoverUrl } from '../config/recommendationPresentation.mjs';
import { safeOfficialWorkUrl } from '../config/workDetailPresentation.mjs';
import type { MatchAnswers } from '../storage/draftTypes';
import { matchedAvoidanceWarnings } from '../engine/avoidanceEngine.mjs';
import { dailySelectionRepository } from './dailySelectionRepository';
import { persistedSelectionKey, resolvePersistedSelection } from './dailyRecommendation/persistentSelection.mjs';
import { dailyMatchReason } from './dailyRecommendation/matchReason.mjs';
import { tagLabelMap } from '@/data/tags/tagLabels';
import { CONTENT_AXIS_LABELS } from '@/data/contentAxis/contentAxisLabels';
import { DAILY_PROGRESS_MESSAGES } from '../config/dailyPicksPresentation.mjs';

type ProgressStage = keyof typeof DAILY_PROGRESS_MESSAGES;

type EvidenceRow = { snapshot_id: string; profile_id: string; completed_at: string; question_set_version: string; answers: MatchAnswers;
  catalog_revision: string;
  snapshot_data: Record<string, unknown>;
  recommendations: Array<{ canonicalWebtoonId: string; title: string; platform: string; createdAt: string; recommendation?: Record<string, unknown>; affectsTaste: boolean }> };
type Selection = { items: Array<{ canonicalWebtoonId: string; title: string; platform: string; matchReason?: { version: number; summary: string; labels: string[] } }> };
type PublicRow = { canonical_webtoon_id: string; title: string; main_genre: string; platform: string; official_url: string | null; cover_url: string | null; avoidance_tag_scores?: Record<string, number> };

async function loadEvidence(database: ReturnType<typeof getMatchDatabase>, publicProfileId: string) {
  const [row] = await database<EvidenceRow[]>`
    select s.snapshot_id::text, s.profile_id::text, s.completed_at::text, s.question_set_version,
      s.snapshot_data, s.snapshot_data->'answers' as answers,
      (select revision::text from public.match_daily_catalog_revision where singleton=true) as catalog_revision,
      coalesce((select jsonb_agg(jsonb_build_object(
        'canonicalWebtoonId', r.canonical_webtoon_id, 'title', w.title, 'platform', w.platform, 'createdAt', r.created_at::text,
        'recommendation', w.raw_data->'recommendation',
        'affectsTaste', w.catalog_status='active' and public.webtoon_is_public_safe(w.raw_data))
        order by r.canonical_webtoon_id)
        from public.match_profile_recommendations r
        join public.webtoons w using(canonical_webtoon_id)
        where r.profile_id=s.profile_id), '[]'::jsonb) as recommendations
    from public.match_taste_snapshots s
    where s.profile_id=(select profile_id from public.match_taste_snapshots where public_profile_id=${publicProfileId})
    order by s.completed_at desc, s.snapshot_id desc limit 1
  `;
  if (!row) throw Error('DAILY_RESULT_NOT_FOUND');
  if (!row.catalog_revision) throw Error('DAILY_CACHE_UNAVAILABLE');
  return row;
}

function originalInput(row: EvidenceRow) {
  return { snapshotId: row.snapshot_id, profileId: row.profile_id, completedAt: row.completed_at,
    questionSetVersion: row.question_set_version, answers: row.answers, snapshotData: row.snapshot_data, recommendations: row.recommendations };
}

/** Persist selected identities and bounded public explanations, never raw evidence/scores. */
export async function getRuntimeDailyTastePicks(publicProfileId: string, { onProgress = () => {} }: { onProgress?: (stage: ProgressStage) => void } = {}) {
  onProgress('checking');
  const database = getMatchDatabase();
  const row = await loadEvidence(database, publicProfileId);
  const input = originalInput(row);
  const now = new Date();
  const window = dailyWindow(now);
  const key = persistedSelectionKey(input, row.catalog_revision, questionSeed, now);
  const selected = await resolvePersistedSelection({
    repository: dailySelectionRepository(database), profileId: row.profile_id, key, window,
    isCurrent: async () => {
      const current = await loadEvidence(database, publicProfileId);
      return persistedSelectionKey(originalInput(current), current.catalog_revision, questionSeed) === key;
    },
    run: async () => {
      if (!await runtime02Available()) throw Error('DAILY_ENGINE_UNAVAILABLE');
      onProgress('narrowing');
      // Do not call getTasteSnapshot(): it already blends registered work vectors.
      // Full catalog identities are read on a cache miss only (not its covers).
      const catalog = await database<{ canonical_webtoon_id: string; title: string; platform: string }[]>`
        select w.canonical_webtoon_id, w.title, w.platform from public.webtoons w
        where w.catalog_status='active' and w.recommendation_eligible=true and public.webtoon_is_public_safe(w.raw_data)
          and w.raw_data->>'sourceDb'='precision' and w.raw_data->>'qualityEvidenceGateDecision'='verified_precision'
          and w.raw_data#>>'{metadata,urlStatus}'='valid' and w.official_url like 'https://%'
          and coalesce(w.raw_data#>>'{metadata,status}','') not in ('unavailable','discontinued')
        order by w.canonical_webtoon_id
      `;
      onProgress('selecting');
      const selection = await selectDailyRuntime02({ ...input,
        liveCatalog: catalog.map(item => ({ canonicalWebtoonId: item.canonical_webtoon_id, title: item.title, platform: item.platform })) }, questionSeed) as Selection;
      if (!selection.items.length) return selection;
      // Three rows at most, once on a cache miss. Reading/opening the sheet never
      // calls the engine again just to generate an explanation.
      const selectedIds = selection.items.map(item => item.canonicalWebtoonId);
      const details = await database<{ canonical_webtoon_id: string; title: string; platform: string; main_genre: string; recommendation: Record<string, unknown> | null }[]>`
        select canonical_webtoon_id,title,platform,main_genre,raw_data->'recommendation' as recommendation
        from public.webtoons where canonical_webtoon_id=any(${selectedIds}::text[])
          and catalog_status='active' and public.webtoon_is_public_safe(raw_data)
      `;
      const detailsById = new Map(details.map(work => [work.canonical_webtoon_id, work]));
      return { items: selection.items.map(item => {
        const detail = detailsById.get(item.canonicalWebtoonId);
        return { canonicalWebtoonId: item.canonicalWebtoonId, title: item.title, platform: item.platform,
          ...(detail && detail.title === item.title && detail.platform === item.platform ? { matchReason: dailyMatchReason(input,
            { mainGenre: detail.main_genre, recommendation: detail.recommendation }, questionSeed,
            { tagLabels: tagLabelMap, contentLabels: CONTENT_AXIS_LABELS }) } : {}) };
      }) };
    },
    onPersist: () => onProgress('saving'),
  }) as Selection | null;
  const envelope = { publicProfileId, selectionVersion: DAILY_SELECTION_VERSION,
    day: window.day, timeZone: window.timeZone, expiresAt: window.expiresAt };
  // Another request owns the lease, or input changed during computation. Never
  // label yesterday's/previous-taste picks as current while the new batch is built.
  if (!selected) { onProgress('waiting'); return { ...envelope, mode: 'preparing' as const, retryAfterMs: 2000, items: [] }; }
  onProgress('readying');
  const ids = selected.items.map(item => item.canonicalWebtoonId);
  const rows = ids.length ? await database<PublicRow[]>`
    select w.canonical_webtoon_id, w.title, w.main_genre, w.platform, w.official_url,
      w.raw_data#>'{recommendation,avoidanceTagScores}' as avoidance_tag_scores,
      coalesce(d.cover_url,w.raw_data->>'coverUrl',w.raw_data#>>'{metadata,coverUrl}',w.raw_data#>>'{cover,src}') as cover_url
    from public.webtoons w left join public.webtoon_details d using(canonical_webtoon_id)
    where w.canonical_webtoon_id=any(${ids}::text[]) and w.catalog_status='active'
      and w.recommendation_eligible=true and public.webtoon_is_public_safe(w.raw_data)
      and w.raw_data->>'sourceDb'='precision' and w.raw_data->>'qualityEvidenceGateDecision'='verified_precision'
      and w.raw_data#>>'{metadata,urlStatus}'='valid' and w.official_url like 'https://%'
      and coalesce(w.raw_data#>>'{metadata,status}','') not in ('unavailable','discontinued')
  ` : [];
  const byId = new Map(rows.map(item => [item.canonical_webtoon_id, item]));
  return { ...envelope, mode: 'personalized' as const,
    items: selected.items.flatMap(item => {
      const live = byId.get(item.canonicalWebtoonId);
      // Never resolve a canonical identity conflict by name guessing or force fill.
      if (!live || live.title !== item.title || live.platform !== item.platform) return [];
      const warnings = matchedAvoidanceWarnings({ answers: row.answers }, { avoidanceTagScores: live.avoidance_tag_scores }, questionSeed);
      return [{ canonicalWebtoonId: live.canonical_webtoon_id, title: live.title, platform: live.platform,
        mainGenreLabel: recommendationGenreLabel(live.main_genre), coverUrl: safeWorkCoverUrl(live.cover_url),
        officialUrl: safeOfficialWorkUrl(live.official_url),
        ...(item.matchReason ? { matchReason: item.matchReason } : {}),
        ...(warnings.length ? { avoidanceWarnings: warnings } : {}) }];
    }) };
}
