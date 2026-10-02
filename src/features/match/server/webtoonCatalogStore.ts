import "server-only";

import { normalizeRecommendationComment } from "../config/recommendationPolicy.mjs";
import { getMatchDatabase } from "./database";

export type WebtoonSummary = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
};

export type WebtoonRecommendationRecord = WebtoonSummary & {
  recommendationComment: string | null;
  likeCount: number;
  likedByViewer: boolean;
  recommendationVector: Record<string, unknown> | null;
};

export type ProfileRecommendationSummary = WebtoonSummary & {
  recommendationComment: string | null;
  likeCount: number;
  likedByViewer: boolean;
};

export type ProfileRecommendationInput = {
  canonicalWebtoonId: string;
  recommendationComment?: string | null;
};

type WebtoonRow = {
  canonical_webtoon_id: string;
  title: string;
  platform: string;
  official_url: string | null;
  main_genre: string;
};

type RecommendationRow = WebtoonRow & {
  profile_id: string;
  sort_order: number;
  recommendation_comment: string | null;
  like_count: number;
  liked_by_viewer: boolean;
};
type RecommendationVectorRow = RecommendationRow & {
  raw_data: { recommendation?: Record<string, unknown> } | null;
};

type SearchCacheEntry = { expiresAt: number; items: WebtoonSummary[] };
const globalCatalogCache = globalThis as typeof globalThis & {
  __webtoonSearchCache?: Map<string, SearchCacheEntry>;
};
const searchCache = globalCatalogCache.__webtoonSearchCache ??= new Map<string, SearchCacheEntry>();
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

function toSummary(row: WebtoonRow): WebtoonSummary {
  return {
    canonicalWebtoonId: row.canonical_webtoon_id,
    title: row.title,
    platform: row.platform,
    officialUrl: row.official_url,
    mainGenre: row.main_genre,
  };
}

function toRecommendationSummary(row: RecommendationRow): ProfileRecommendationSummary {
  return {
    ...toSummary(row),
    recommendationComment: row.recommendation_comment,
    likeCount: Number(row.like_count) || 0,
    likedByViewer: Boolean(row.liked_by_viewer),
  };
}

export async function getProfileIdForAnonymousId(anonymousId: string) {
  const database = getMatchDatabase();
  const rows = await database<{ profile_id: string }[]>`
    select profile_id::text
    from public.match_profiles
    where anonymous_id = ${anonymousId}::uuid
    limit 1
  `;
  return rows[0]?.profile_id ?? null;
}

export function normalizeWebtoonTitle(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export function compactWebtoonTitle(value: string) {
  return normalizeWebtoonTitle(value).replaceAll(" ", "");
}

export async function searchWebtoons(query: string, limit = 20) {
  const normalized = normalizeWebtoonTitle(query);
  const compact = compactWebtoonTitle(query);
  if (compact.length < 1) return [];
  const boundedLimit = Math.max(1, Math.min(30, limit));
  const cacheKey = `${compact}:${boundedLimit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const database = getMatchDatabase();
  const rows = await database<WebtoonRow[]>`
    select canonical_webtoon_id, title, platform, official_url, main_genre
    from public.webtoons
    where catalog_status = 'active'
      and recommendation_eligible = true
      and (
        normalized_title like ${`%${normalized}%`}
        or replace(normalized_title, ' ', '') like ${`%${compact}%`}
      )
    order by
      case
        when normalized_title = ${normalized} then 0
        when replace(normalized_title, ' ', '') = ${compact} then 1
        when normalized_title like ${`${normalized}%`} then 2
        when replace(normalized_title, ' ', '') like ${`${compact}%`} then 3
        else 4
      end,
      char_length(normalized_title) asc,
      title asc,
      platform asc
    limit ${boundedLimit}
  `;
  const items = rows.map(toSummary);
  searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, items });
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  return items;
}

export async function getProfileRecommendations(publicProfileId: string, viewerAnonymousId?: string | null) {
  const database = getMatchDatabase();
  const viewerProfileId = viewerAnonymousId
    ? await getProfileIdForAnonymousId(viewerAnonymousId)
    : null;
  const rows = await database<RecommendationRow[]>`
    select
      recommendations.profile_id::text,
      recommendations.sort_order,
      recommendations.recommendation_comment,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre,
      count(likes.liker_profile_id)::int as like_count,
      coalesce(bool_or(likes.liker_profile_id = ${viewerProfileId}::uuid), false) as liked_by_viewer
    from public.match_profile_recommendations recommendations
    join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
    join public.match_taste_snapshots snapshots on snapshots.profile_id = recommendations.profile_id
    left join public.match_profile_recommendation_likes likes
      on likes.recommender_profile_id = recommendations.profile_id
      and likes.canonical_webtoon_id = recommendations.canonical_webtoon_id
    where snapshots.public_profile_id = ${publicProfileId}
      and webtoons.catalog_status = 'active'
    group by
      recommendations.profile_id,
      recommendations.sort_order,
      recommendations.recommendation_comment,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre
    order by recommendations.sort_order asc
  `;
  return rows.map(toRecommendationSummary);
}

export async function getRecommendationsForProfiles(profileIds: string[], viewerProfileId?: string | null) {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];
  const result = Object.fromEntries(uniqueProfileIds.map((profileId) => [profileId, [] as WebtoonRecommendationRecord[]]));
  if (!uniqueProfileIds.length) return result;

  const database = getMatchDatabase();
  const rows = await database<RecommendationVectorRow[]>`
    select
      recommendations.profile_id::text,
      recommendations.sort_order,
      recommendations.recommendation_comment,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre,
      webtoons.raw_data,
      count(likes.liker_profile_id)::int as like_count,
      coalesce(bool_or(likes.liker_profile_id = ${viewerProfileId ?? null}::uuid), false) as liked_by_viewer
    from public.match_profile_recommendations recommendations
    join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
    left join public.match_profile_recommendation_likes likes
      on likes.recommender_profile_id = recommendations.profile_id
      and likes.canonical_webtoon_id = recommendations.canonical_webtoon_id
    where recommendations.profile_id = any(${uniqueProfileIds}::uuid[])
      and webtoons.catalog_status = 'active'
    group by
      recommendations.profile_id,
      recommendations.sort_order,
      recommendations.recommendation_comment,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre,
      webtoons.raw_data
    order by recommendations.profile_id, recommendations.sort_order asc
  `;
  for (const row of rows) {
    result[row.profile_id]?.push({
      ...toRecommendationSummary(row),
      recommendationVector: row.raw_data?.recommendation ?? null,
    });
  }
  return result;
}

export async function replaceProfileRecommendations(input: { publicProfileId: string; anonymousId: string; recommendations: ProfileRecommendationInput[] }) {
  if (!Array.isArray(input.recommendations) || input.recommendations.length > 10) {
    throw new Error("INVALID_RECOMMENDATION_LIST");
  }
  const normalizedItems = input.recommendations.map((item) => ({
    canonicalWebtoonId: item.canonicalWebtoonId?.trim(),
    recommendationComment: normalizeRecommendationComment(item.recommendationComment),
  }));
  const ids = normalizedItems.map((item) => item.canonicalWebtoonId).filter(Boolean);
  if (ids.length !== normalizedItems.length || new Set(ids).size !== ids.length) {
    throw new Error("INVALID_RECOMMENDATION_LIST");
  }

  const database = getMatchDatabase();
  return database.begin(async (sql) => {
    const profiles = await sql<{ profile_id: string }[]>`
      select profiles.profile_id::text
      from public.match_profiles profiles
      join public.match_taste_snapshots snapshots on snapshots.profile_id = profiles.profile_id
      where snapshots.public_profile_id = ${input.publicProfileId}
        and profiles.anonymous_id = ${input.anonymousId}::uuid
      limit 1
      for update of profiles
    `;
    const profileId = profiles[0]?.profile_id;
    if (!profileId) throw new Error("RESULT_OWNER_MISMATCH");

    const current = await sql<{ canonical_webtoon_id: string; recommendation_comment: string | null }[]>`
      select canonical_webtoon_id, recommendation_comment
      from public.match_profile_recommendations
      where profile_id = ${profileId}::uuid
    `;
    const currentCommentById = new Map(
      current.map((row) => [row.canonical_webtoon_id, row.recommendation_comment]),
    );

    let available: WebtoonRow[] = [];
    if (ids.length) {
      available = await sql<WebtoonRow[]>`
        select canonical_webtoon_id, title, platform, official_url, main_genre
        from public.webtoons
        where canonical_webtoon_id = any(${ids}::text[])
          and catalog_status = 'active'
          and recommendation_eligible = true
      `;
      if (available.length !== ids.length) throw new Error("WEBTOON_NOT_AVAILABLE");
    }

    if (ids.length) {
      await sql`
        delete from public.match_profile_recommendations
        where profile_id = ${profileId}::uuid
          and not (canonical_webtoon_id = any(${ids}::text[]))
      `;
    } else {
      await sql`delete from public.match_profile_recommendations where profile_id = ${profileId}::uuid`;
    }
    for (const [index, item] of normalizedItems.entries()) {
      const recommendationComment = item.recommendationComment === undefined
        ? currentCommentById.get(item.canonicalWebtoonId) ?? null
        : item.recommendationComment;
      await sql`
        insert into public.match_profile_recommendations (
          profile_id,
          canonical_webtoon_id,
          sort_order,
          recommendation_comment
        )
        values (
          ${profileId}::uuid,
          ${item.canonicalWebtoonId},
          ${index + 1},
          ${recommendationComment}
        )
        on conflict (profile_id, canonical_webtoon_id) do update set
          sort_order = excluded.sort_order,
          recommendation_comment = excluded.recommendation_comment,
          updated_at = now()
      `;
    }

    const savedRows = await sql<RecommendationRow[]>`
      select
        recommendations.profile_id::text,
        recommendations.sort_order,
        recommendations.recommendation_comment,
        webtoons.canonical_webtoon_id,
        webtoons.title,
        webtoons.platform,
        webtoons.official_url,
        webtoons.main_genre,
        count(likes.liker_profile_id)::int as like_count,
        false as liked_by_viewer
      from public.match_profile_recommendations recommendations
      join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
      left join public.match_profile_recommendation_likes likes
        on likes.recommender_profile_id = recommendations.profile_id
        and likes.canonical_webtoon_id = recommendations.canonical_webtoon_id
      where recommendations.profile_id = ${profileId}::uuid
      group by
        recommendations.profile_id,
        recommendations.sort_order,
        recommendations.recommendation_comment,
        webtoons.canonical_webtoon_id,
        webtoons.title,
        webtoons.platform,
        webtoons.official_url,
        webtoons.main_genre
      order by recommendations.sort_order asc
    `;
    return {
      profileId,
      items: savedRows.map(toRecommendationSummary),
    };
  });
}

export async function setProfileRecommendationLike(input: {
  recommenderPublicProfileId: string;
  canonicalWebtoonId: string;
  likerAnonymousId: string;
  liked: boolean;
}) {
  const database = getMatchDatabase();
  return database.begin(async (sql) => {
    const recommendations = await sql<{ recommender_profile_id: string }[]>`
      select recommendations.profile_id::text as recommender_profile_id
      from public.match_profile_recommendations recommendations
      join public.match_taste_snapshots snapshots on snapshots.profile_id = recommendations.profile_id
      join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
      where snapshots.public_profile_id = ${input.recommenderPublicProfileId}
        and recommendations.canonical_webtoon_id = ${input.canonicalWebtoonId}
        and webtoons.catalog_status = 'active'
      limit 1
      for update of recommendations
    `;
    const recommenderProfileId = recommendations[0]?.recommender_profile_id;
    if (!recommenderProfileId) throw new Error("RECOMMENDATION_NOT_FOUND");

    const likerProfiles = await sql<{ profile_id: string }[]>`
      select profile_id::text
      from public.match_profiles
      where anonymous_id = ${input.likerAnonymousId}::uuid
      limit 1
    `;
    const likerProfileId = likerProfiles[0]?.profile_id;
    if (!likerProfileId) throw new Error("LIKE_PROFILE_REQUIRED");
    if (likerProfileId === recommenderProfileId) {
      throw new Error("SELF_RECOMMENDATION_LIKE_FORBIDDEN");
    }

    if (input.liked) {
      await sql`
        insert into public.match_profile_recommendation_likes (
          recommender_profile_id,
          canonical_webtoon_id,
          liker_profile_id
        )
        values (
          ${recommenderProfileId}::uuid,
          ${input.canonicalWebtoonId},
          ${likerProfileId}::uuid
        )
        on conflict do nothing
      `;
    } else {
      await sql`
        delete from public.match_profile_recommendation_likes
        where recommender_profile_id = ${recommenderProfileId}::uuid
          and canonical_webtoon_id = ${input.canonicalWebtoonId}
          and liker_profile_id = ${likerProfileId}::uuid
      `;
    }

    const counts = await sql<{ like_count: number; liked_by_viewer: boolean }[]>`
      select
        count(*)::int as like_count,
        coalesce(bool_or(liker_profile_id = ${likerProfileId}::uuid), false) as liked_by_viewer
      from public.match_profile_recommendation_likes
      where recommender_profile_id = ${recommenderProfileId}::uuid
        and canonical_webtoon_id = ${input.canonicalWebtoonId}
    `;
    return {
      likeCount: Number(counts[0]?.like_count) || 0,
      likedByViewer: Boolean(counts[0]?.liked_by_viewer),
    };
  });
}
