import "server-only";

import { normalizeRecommendationComment } from "../config/recommendationPolicy.mjs";
import { safeWorkCoverUrl } from "../config/recommendationPresentation.mjs";
import { getMatchDatabase } from "./database";
import { writeRecommendationComment, setRecommendationCommentLike } from './recommendationCommentStore';

export type WebtoonSummary = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
  coverUrl?: string | null;
  introduction?: string | null;
  recommendationRegistrationBlocked?: boolean;
};

export type WebtoonRecommendationRecord = WebtoonSummary & {
  commentId: string | null;
  recommendationComment: string | null;
  likeCount: number;
  likedByViewer: boolean;
  recommendationVector: Record<string, unknown> | null;
};

export type ProfileRecommendationSummary = WebtoonSummary & {
  commentId: string | null;
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
  cover_url?: string | null;
  introduction?: string | null;
  recommendation_registration_blocked?: boolean;
};

type RecommendationRow = WebtoonRow & {
  comment_id: string | null;
  profile_id: string;
  sort_order: number;
  recommendation_comment: string | null;
  like_count: number;
  liked_by_viewer: boolean;
};
type RecommendationVectorRow = RecommendationRow & {
  raw_data: { recommendation?: Record<string, unknown> } | null;
};

type SearchCacheEntry = { expiresAt: number; items: WebtoonSummary[]; hasMore: boolean };
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
    coverUrl: safeWorkCoverUrl(row.cover_url),
    introduction: typeof row.introduction === "string" ? row.introduction.slice(0, 200) : null,
    recommendationRegistrationBlocked: row.recommendation_registration_blocked === true,
  };
}

function toRecommendationSummary(row: RecommendationRow): ProfileRecommendationSummary {
  return {
    ...toSummary(row),
    commentId: row.comment_id ?? null,
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

/** Restart only the caller's recommendations, never their identity or result history. */
export async function clearRecommendationsForRestart(anonymousId: string) {
  const database = getMatchDatabase();
  return database.begin(async sql => {
    const profiles = await sql<{ profile_id: string }[]>`
      select profile_id::text from public.match_profiles
      where anonymous_id = ${anonymousId}::uuid
      for update
    `;
    const profileId = profiles[0]?.profile_id;
    if (!profileId) return { profileId: null, removedCount: 0 };
    // Clear membership only. Independent comments and their likes survive a restart.
    const removed = await sql<{ canonical_webtoon_id: string }[]>`
      delete from public.match_profile_recommendations
      where profile_id = ${profileId}::uuid
      returning canonical_webtoon_id
    `;
    return { profileId, removedCount: removed.length };
  });
}

export function normalizeWebtoonTitle(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export function compactWebtoonTitle(value: string) {
  return normalizeWebtoonTitle(value).replaceAll(" ", "");
}

export async function searchWebtoons(query: string, limit = 20) {
  const boundedLimit = Math.max(1, Math.min(30, limit));
  return (await searchCatalogPage(query, true, boundedLimit, 1)).items;
}

/** General browsing includes active works that cannot be registered as recommendations. */
export async function searchCatalogWebtoons(query: string, page = 1) {
  return searchCatalogPage(query, false, 20, page);
}

async function searchCatalogPage(query: string, eligibleOnly: boolean, pageSize: number, page: number) {
  const normalized = normalizeWebtoonTitle(query);
  const compact = compactWebtoonTitle(query);
  if (compact.length < 1) return { items: [], hasMore: false };
  if (normalized.length > 100 || !Number.isInteger(page) || page < 1 || page > 10000) throw new Error('INVALID_WEBTOON_SEARCH');
  const cacheKey = `paged-v2-sexual-core:${eligibleOnly}:${normalized}:${pageSize}:${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { items: cached.items, hasMore: cached.hasMore };
  const literal = (value: string) => value.replace(/[\\%_]/g, '\\$&');
  const database = getMatchDatabase();
  const rows = await database<WebtoonRow[]>`
    select canonical_webtoon_id, title, platform, official_url, main_genre,
      coalesce(details.cover_url,raw_data->>'coverUrl', raw_data#>>'{metadata,coverUrl}', raw_data#>>'{cover,src}') as cover_url,
      left(coalesce(details.synopsis,raw_data->>'introduction', raw_data#>>'{metadata,description}',raw_data#>>'{recommendation,recommendationReason}'), 200) as introduction,
      coalesce(raw_data#>>'{metadata,sexualCore}' = 'true', false) as recommendation_registration_blocked
    from public.webtoons
    left join public.webtoon_details details using(canonical_webtoon_id)
    where catalog_status = 'active'
      and (${eligibleOnly} = false or (
        recommendation_eligible = true
        and coalesce(raw_data#>>'{metadata,sexualCore}', 'false') <> 'true'
      ))
      and (
        normalized_title like ${`%${literal(normalized)}%`}
        or replace(normalized_title, ' ', '') like ${`%${literal(compact)}%`}
      )
    order by
      case
        when normalized_title = ${normalized} then 0
        when replace(normalized_title, ' ', '') = ${compact} then 1
        when normalized_title like ${`${literal(normalized)}%`} then 2
        when replace(normalized_title, ' ', '') like ${`${literal(compact)}%`} then 3
        else 4
      end,
      char_length(normalized_title) asc,
      title asc,
      platform asc,
      canonical_webtoon_id asc
    limit ${pageSize + 1} offset ${(page - 1) * pageSize}
  `;
  const items = rows.slice(0, pageSize).map(toSummary);
  const hasMore = rows.length > pageSize && page < 10000;
  searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, items, hasMore });
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  return { items, hasMore };
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
      comments.comment_id::text,
      comments.body as recommendation_comment,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre,
      bool_or(coalesce(webtoons.raw_data#>>'{metadata,sexualCore}' = 'true', false)) as recommendation_registration_blocked,
      max(coalesce(details.cover_url,webtoons.raw_data->>'coverUrl', webtoons.raw_data#>>'{metadata,coverUrl}', webtoons.raw_data#>>'{cover,src}')) as cover_url,
      max(left(coalesce(details.synopsis,webtoons.raw_data->>'introduction', webtoons.raw_data#>>'{metadata,description}',webtoons.raw_data#>>'{recommendation,recommendationReason}'), 200)) as introduction,
      count(likes.liker_profile_id)::int as like_count,
      coalesce(bool_or(likes.liker_profile_id = ${viewerProfileId}::uuid), false) as liked_by_viewer
    from public.match_profile_recommendations recommendations
    join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
    left join public.webtoon_details details on details.canonical_webtoon_id = webtoons.canonical_webtoon_id
    join public.match_taste_snapshots snapshots on snapshots.profile_id = recommendations.profile_id
    left join public.match_recommendation_comments comments
      on comments.author_profile_id = recommendations.profile_id
      and comments.canonical_webtoon_id = recommendations.canonical_webtoon_id and comments.deleted_at is null
    left join public.match_recommendation_comment_likes likes on likes.comment_id = comments.comment_id
    where snapshots.public_profile_id = ${publicProfileId}
      and webtoons.catalog_status = 'active'
    group by
      recommendations.profile_id,
      recommendations.sort_order,
      comments.comment_id,
      comments.body,
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
      comments.comment_id::text,
      comments.body as recommendation_comment,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre,
      webtoons.raw_data,
      max(coalesce(details.cover_url,webtoons.raw_data->>'coverUrl',webtoons.raw_data#>>'{metadata,coverUrl}',webtoons.raw_data#>>'{cover,src}')) as cover_url,
      max(left(coalesce(details.synopsis,webtoons.raw_data#>>'{recommendation,recommendationReason}'),200)) as introduction,
      count(likes.liker_profile_id)::int as like_count,
      coalesce(bool_or(likes.liker_profile_id = ${viewerProfileId ?? null}::uuid), false) as liked_by_viewer
    from public.match_profile_recommendations recommendations
    join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
    left join public.webtoon_details details on details.canonical_webtoon_id = webtoons.canonical_webtoon_id
    left join public.match_recommendation_comments comments
      on comments.author_profile_id = recommendations.profile_id
      and comments.canonical_webtoon_id = recommendations.canonical_webtoon_id and comments.deleted_at is null
    left join public.match_recommendation_comment_likes likes on likes.comment_id = comments.comment_id
    where recommendations.profile_id = any(${uniqueProfileIds}::uuid[])
      and webtoons.catalog_status = 'active'
    group by
      recommendations.profile_id,
      recommendations.sort_order,
      comments.comment_id,
      comments.body,
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
      select canonical_webtoon_id, body as recommendation_comment
      from public.match_recommendation_comments
      where author_profile_id = ${profileId}::uuid and deleted_at is null
    `;
    const currentCommentById = new Map(
      current.map((row) => [row.canonical_webtoon_id, row.recommendation_comment]),
    );

    let available: WebtoonRow[] = [];
    if (ids.length) {
      available = await sql<WebtoonRow[]>`
        select canonical_webtoon_id, title, platform, official_url, main_genre,
          coalesce(raw_data#>>'{metadata,sexualCore}' = 'true', false) as recommendation_registration_blocked
        from public.webtoons
        where canonical_webtoon_id = any(${ids}::text[])
          and catalog_status = 'active'
          and recommendation_eligible = true
        for share
      `;
      if (available.length !== ids.length) throw new Error("WEBTOON_NOT_AVAILABLE");
      // Check trusted, current DB metadata before any list mutation. The row lock
      // also prevents a concurrent catalog update from changing this flag mid-save.
      if (available.some(row => row.recommendation_registration_blocked)) {
        throw new Error('RECOMMENDATION_AGE_VERIFICATION_REQUIRED');
      }
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
      await writeRecommendationComment(sql, profileId, item.canonicalWebtoonId, item.recommendationComment);
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
        comments.comment_id::text,
        comments.body as recommendation_comment,
        webtoons.canonical_webtoon_id,
        webtoons.title,
        webtoons.platform,
        webtoons.official_url,
        webtoons.main_genre,
        bool_or(coalesce(webtoons.raw_data#>>'{metadata,sexualCore}' = 'true', false)) as recommendation_registration_blocked,
        max(coalesce(details.cover_url,webtoons.raw_data->>'coverUrl', webtoons.raw_data#>>'{metadata,coverUrl}', webtoons.raw_data#>>'{cover,src}')) as cover_url,
        max(left(coalesce(details.synopsis,webtoons.raw_data->>'introduction', webtoons.raw_data#>>'{metadata,description}',webtoons.raw_data#>>'{recommendation,recommendationReason}'), 200)) as introduction,
        count(likes.liker_profile_id)::int as like_count,
        false as liked_by_viewer
      from public.match_profile_recommendations recommendations
      join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
      left join public.webtoon_details details on details.canonical_webtoon_id = webtoons.canonical_webtoon_id
      left join public.match_recommendation_comments comments
        on comments.author_profile_id = recommendations.profile_id
        and comments.canonical_webtoon_id = recommendations.canonical_webtoon_id and comments.deleted_at is null
      left join public.match_recommendation_comment_likes likes on likes.comment_id = comments.comment_id
      where recommendations.profile_id = ${profileId}::uuid
      group by
        recommendations.profile_id,
        recommendations.sort_order,
        comments.comment_id,
        comments.body,
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
  // Older clients resolve the same independent comment, never a work-wide like.
  const rows = await getMatchDatabase()<{comment_id:string}[]>`
    select c.comment_id::text from public.match_recommendation_comments c
    join public.match_taste_snapshots s on s.profile_id=c.author_profile_id
    where s.public_profile_id=${input.recommenderPublicProfileId}
      and c.canonical_webtoon_id=${input.canonicalWebtoonId} and c.deleted_at is null limit 1
  `;
  if(!rows[0])throw new Error('RECOMMENDATION_COMMENT_NOT_FOUND');
  return setRecommendationCommentLike({commentId:rows[0].comment_id,likerAnonymousId:input.likerAnonymousId,liked:input.liked});
}
