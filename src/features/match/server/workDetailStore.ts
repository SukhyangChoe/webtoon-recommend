import 'server-only';
import questionSeed from '../data/questionSeed.v0.4.json';
import { getMatchDatabase } from './database';
import { getTasteSnapshot } from './resultStore';
import { calculateRecommendationFit } from '../engine/recommendationFitEngine.mjs';
import { recommendationGenreLabel, safeWorkCoverUrl } from '../config/recommendationPresentation.mjs';
import { rankedWorkLabels, safeOfficialWorkUrl, sharedFitReasons, WORK_POINT_ICONS, workArtStyleCards, workStatusLabel } from '../config/workDetailPresentation.mjs';
import { tagLabelMap } from '@/data/tags/tagLabels';
import { CONTENT_AXIS_LABELS } from '@/data/contentAxis/contentAxisLabels';

type ScoreMap = Record<string, number>;
type Recommendation = { tagScores?: ScoreMap; contentAxisScores?: ScoreMap; artStyleScores?: ScoreMap; recommendationReason?: string };
type DetailRow = {
  canonical_webtoon_id: string; title: string; platform: string; main_genre: string;
  official_url: string | null; cover_url: string | null; synopsis: string | null;
  synopsis_kind: string | null; creators: Array<{ name?: string; roles?: string[] }> | null;
  imported_data: { status?: string; ageRating?: string } | null;
  recommendation: Recommendation | null;
};

export async function getWorkDetail(id: string, requestedProfile?: string | null, anonymousId?: string | null) {
  const sql = getMatchDatabase();
  const [row] = await sql<DetailRow[]>`
    select w.canonical_webtoon_id,w.title,w.platform,w.main_genre,w.official_url,
      coalesce(d.cover_url,w.raw_data->>'coverUrl',w.raw_data#>>'{metadata,coverUrl}',w.raw_data#>>'{cover,src}') as cover_url,
      d.synopsis,d.synopsis_kind,d.creators,d.imported_data,w.raw_data->'recommendation' as recommendation
    from public.webtoons w left join public.webtoon_details d using(canonical_webtoon_id)
    where w.canonical_webtoon_id=${id} and w.catalog_status='active' limit 1
  `;
  if (!row) return null;
  let profileId = requestedProfile;
  if (!profileId && anonymousId) {
    const [profile] = await sql<{ public_profile_id: string }[]>`
      select s.public_profile_id from public.match_taste_snapshots s join public.match_profiles p using(profile_id)
      where p.anonymous_id=${anonymousId}::uuid order by s.completed_at desc limit 1
    `;
    profileId = profile?.public_profile_id;
  }
  const snapshot = profileId ? await getTasteSnapshot(profileId) : null;
  const fit = snapshot ? calculateRecommendationFit(snapshot.tasteVector, row.recommendation, questionSeed) : null;
  const comparable = fit && fit.comparableAxes.length >= 2;
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
    fit: comparable ? { percent: Math.round(fit.score * 100), highlighted: fit.highlighted,
      profilePublicId: snapshot!.publicProfileId, nickname: snapshot!.profileDisplayName || null,
      reasons: sharedFitReasons(snapshot!.tasteVector, recommendation, tagLabelMap, CONTENT_AXIS_LABELS) } : null,
  };
}

export type WorkDetail = NonNullable<Awaited<ReturnType<typeof getWorkDetail>>>;
