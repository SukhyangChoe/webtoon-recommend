import 'server-only';
import questionSeed from '../data/questionSeed.v0.4.json';
import { getMatchDatabase } from './database';
import { getLatestTasteSnapshotForAnonymousId } from './resultStore';
import { calculateRecommendationFit } from '../engine/recommendationFitEngine.mjs';
import { recommendationFitPresentation } from '../config/recommendationFitDisplay.mjs';
import { matchedAvoidanceWarnings } from '../engine/avoidanceEngine.mjs';
import { recommendationGenreLabel, safeWorkCoverUrl } from '../config/recommendationPresentation.mjs';
import { rankedWorkLabels, safeOfficialWorkUrl, sharedFitReasons, WORK_POINT_ICONS, workArtStyleCards, workStatusLabel } from '../config/workDetailPresentation.mjs';
import { tagLabelMap } from '@/data/tags/tagLabels';
import { CONTENT_AXIS_LABELS } from '@/data/contentAxis/contentAxisLabels';
import type { WorkReadContext } from './workReadDeadline';

type ScoreMap = Record<string, number>;
type Recommendation = { tagScores?: ScoreMap; contentAxisScores?: ScoreMap; artStyleScores?: ScoreMap; avoidanceTagScores?: ScoreMap; recommendationReason?: string };
type DetailRow = {
  canonical_webtoon_id: string; title: string; platform: string; main_genre: string;
  official_url: string | null; cover_url: string | null; synopsis: string | null;
  synopsis_kind: string | null; creators: Array<{ name?: string; roles?: string[] }> | null;
  imported_data: { status?: string; ageRating?: string } | null;
  recommendation: Recommendation | null;
};

async function readWorkRow(id: string, read?: WorkReadContext) {
  const sql = getMatchDatabase();
  const rows = read ? await read.query<DetailRow[]>('work', `
    select w.canonical_webtoon_id,w.title,w.platform,w.main_genre,w.official_url,
      coalesce(d.cover_url,w.raw_data->>'coverUrl',w.raw_data#>>'{metadata,coverUrl}',w.raw_data#>>'{cover,src}') as cover_url,
      d.synopsis,d.synopsis_kind,d.creators,d.imported_data,w.raw_data->'recommendation' as recommendation
    from public.webtoons w left join public.webtoon_details d using(canonical_webtoon_id)
    where w.canonical_webtoon_id=$1 and w.catalog_status='active' and public.webtoon_is_public_safe(w.raw_data) limit 1`, [id]) : await sql<DetailRow[]>`
    select w.canonical_webtoon_id,w.title,w.platform,w.main_genre,w.official_url,
      coalesce(d.cover_url,w.raw_data->>'coverUrl',w.raw_data#>>'{metadata,coverUrl}',w.raw_data#>>'{cover,src}') as cover_url,
      d.synopsis,d.synopsis_kind,d.creators,d.imported_data,w.raw_data->'recommendation' as recommendation
    from public.webtoons w left join public.webtoon_details d using(canonical_webtoon_id)
    where w.canonical_webtoon_id=${id} and w.catalog_status='active' and public.webtoon_is_public_safe(w.raw_data) limit 1
  `;
  return rows[0] ?? null;
}

function workInfo(row: DetailRow) {
  const recommendation = row.recommendation;
  const creators = (Array.isArray(row.creators) ? row.creators : []).flatMap(creator => typeof creator?.name === 'string' && creator.name.trim()
    ? [{ name: creator.name.trim().slice(0, 100), roles: Array.isArray(creator.roles) ? creator.roles.filter(role => typeof role === 'string').slice(0, 3) : [] }] : []);
  const intro = row.synopsis?.trim() || recommendation?.recommendationReason?.trim() || null;
  return {
    canonicalWebtoonId: row.canonical_webtoon_id, title: row.title, platform: row.platform,
    mainGenre: row.main_genre, mainGenreLabel: recommendationGenreLabel(row.main_genre),
    coverUrl: safeWorkCoverUrl(row.cover_url), officialUrl: safeOfficialWorkUrl(row.official_url),
    introduction: intro?.slice(0, 10000) ?? null,
    introductionKind: row.synopsis ? row.synopsis_kind : 'editorial',
    creators, statusLabel: workStatusLabel(row.imported_data?.status), ageRating: row.imported_data?.ageRating?.trim() || null,
    contentLabels: rankedWorkLabels(recommendation?.contentAxisScores, CONTENT_AXIS_LABELS, {}, 3),
    appreciationPoints: rankedWorkLabels(recommendation?.tagScores, tagLabelMap, WORK_POINT_ICONS, 2),
    artStyles: workArtStyleCards(recommendation?.artStyleScores, 2),
    fitStatus: 'pending' as const, fit: null, avoidanceWarnings: [] as Array<{ key: string; label: string }>,
  };
}

async function workFit(row: DetailRow, anonymousId?: string | null, read?: WorkReadContext) {
  const snapshot = anonymousId ? await getLatestTasteSnapshotForAnonymousId(anonymousId, read) : null;
  const calculate = () => snapshot ? calculateRecommendationFit(snapshot.tasteVector, row.recommendation, questionSeed) : null;
  const fit = read ? read.measure('fit_compute', calculate) : calculate();
  const presentation = fit ? recommendationFitPresentation(fit.score) : null;
  if (fit && presentation === null) console.warn('[work_fit] invalid engine score', { score: fit.score });
  const comparable = fit && fit.comparableAxes.length >= 2 && presentation !== null;
  return {
    fitStatus: !snapshot ? 'test_required' as const : comparable ? 'ready' as const : 'insufficient_data' as const,
    // A warning does not depend on having enough positive axes for a fit number.
    avoidanceWarnings: matchedAvoidanceWarnings(snapshot, row.recommendation, questionSeed) as Array<{ key: string; label: string }>,
    fit: comparable ? { ...presentation!, highlighted: fit.highlighted,
      profilePublicId: snapshot!.publicProfileId, nickname: snapshot!.profileDisplayName || null,
      reasons: sharedFitReasons(snapshot!.tasteVector, row.recommendation, tagLabelMap, CONTENT_AXIS_LABELS, { limit: 5, descriptions: true }) } : null,
  };
}

export async function getWorkInfo(id: string, read?: WorkReadContext) {
  const row = await readWorkRow(id, read);
  return row ? workInfo(row) : null;
}

export async function getWorkFit(id: string, anonymousId?: string | null, read?: WorkReadContext) {
  const row = await readWorkRow(id, read);
  return row ? workFit(row, anonymousId, read) : null;
}

// Legacy API clients can still request the combined representation, with the same live viewer policy.
export async function getWorkDetail(id: string, anonymousId?: string | null, read?: WorkReadContext) {
  const row = await readWorkRow(id, read);
  return row ? { ...workInfo(row), ...await workFit(row, anonymousId, read) } : null;
}

type CompletedWork = NonNullable<Awaited<ReturnType<typeof getWorkDetail>>>;
export type WorkDetail = Omit<CompletedWork, 'fitStatus'> & { fitStatus: CompletedWork['fitStatus'] | 'pending' };
export type WorkFit = NonNullable<Awaited<ReturnType<typeof getWorkFit>>>;
