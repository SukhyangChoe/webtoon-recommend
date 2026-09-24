import "server-only";

import { getMatchDatabase } from "./database";

export type WebtoonSummary = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
};

type WebtoonRow = {
  canonical_webtoon_id: string;
  title: string;
  platform: string;
  official_url: string | null;
  main_genre: string;
};

type RecommendationRow = WebtoonRow & { profile_id: string; sort_order: number };

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

export function normalizeWebtoonTitle(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export async function searchWebtoons(query: string, limit = 20) {
  const normalized = normalizeWebtoonTitle(query);
  if (normalized.length < 1) return [];
  const boundedLimit = Math.max(1, Math.min(30, limit));
  const cacheKey = `${normalized}:${boundedLimit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const database = getMatchDatabase();
  const rows = await database<WebtoonRow[]>`
    select canonical_webtoon_id, title, platform, official_url, main_genre
    from public.webtoons
    where catalog_status = 'active'
      and recommendation_eligible = true
      and normalized_title like ${`%${normalized}%`}
    order by
      case
        when normalized_title = ${normalized} then 0
        when normalized_title like ${`${normalized}%`} then 1
        else 2
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

export async function getProfileRecommendations(publicProfileId: string) {
  const database = getMatchDatabase();
  const rows = await database<RecommendationRow[]>`
    select
      recommendations.profile_id::text,
      recommendations.sort_order,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre
    from public.match_profile_recommendations recommendations
    join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
    join public.match_taste_snapshots snapshots on snapshots.profile_id = recommendations.profile_id
    where snapshots.public_profile_id = ${publicProfileId}
      and webtoons.catalog_status <> 'hidden'
    order by recommendations.sort_order asc
  `;
  return rows.map(toSummary);
}

export async function getRecommendationsForProfiles(profileIds: string[]) {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];
  const result = Object.fromEntries(uniqueProfileIds.map((profileId) => [profileId, [] as WebtoonSummary[]]));
  if (!uniqueProfileIds.length) return result;

  const database = getMatchDatabase();
  const rows = await database<RecommendationRow[]>`
    select
      recommendations.profile_id::text,
      recommendations.sort_order,
      webtoons.canonical_webtoon_id,
      webtoons.title,
      webtoons.platform,
      webtoons.official_url,
      webtoons.main_genre
    from public.match_profile_recommendations recommendations
    join public.webtoons webtoons on webtoons.canonical_webtoon_id = recommendations.canonical_webtoon_id
    where recommendations.profile_id = any(${uniqueProfileIds}::uuid[])
      and webtoons.catalog_status <> 'hidden'
    order by recommendations.profile_id, recommendations.sort_order asc
  `;
  for (const row of rows) result[row.profile_id]?.push(toSummary(row));
  return result;
}

export async function replaceProfileRecommendations(input: { publicProfileId: string; anonymousId: string; canonicalWebtoonIds: string[] }) {
  const ids = [...new Set(input.canonicalWebtoonIds.map((item) => item.trim()).filter(Boolean))];
  if (ids.length !== input.canonicalWebtoonIds.length || ids.length > 10) throw new Error("INVALID_RECOMMENDATION_LIST");

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

    await sql`delete from public.match_profile_recommendations where profile_id = ${profileId}::uuid`;
    for (const [index, canonicalWebtoonId] of ids.entries()) {
      await sql`
        insert into public.match_profile_recommendations (profile_id, canonical_webtoon_id, sort_order)
        values (${profileId}::uuid, ${canonicalWebtoonId}, ${index + 1})
      `;
    }

    const byId = new Map(available.map((row) => [row.canonical_webtoon_id, toSummary(row)]));
    return ids.map((id) => byId.get(id)).filter((item): item is WebtoonSummary => Boolean(item));
  });
}
