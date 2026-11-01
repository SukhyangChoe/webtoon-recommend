import { NextResponse } from "next/server";
import { searchCatalogWebtoons, searchWebtoons } from "@/features/match/server/webtoonCatalogStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get('q')?.trim() ?? '';
    const scope = params.get('scope') ?? 'recommendations';
    const pageText = params.get('page') ?? '1';
    const page = Number(pageText);
    if (query.length > 100 || !['catalog', 'recommendations'].includes(scope) || !/^\d{1,5}$/.test(pageText) || page < 1 || page > 10000) {
      return NextResponse.json({ error: 'INVALID_WEBTOON_SEARCH' }, { status: 400 });
    }
    const body = scope === 'catalog' ? { ...await searchCatalogWebtoons(query, page), page } : { items: await searchWebtoons(query) };
    const response = NextResponse.json(body);
    response.headers.set("Cache-Control", scope === 'recommendations' ? 'no-store' : 'public, s-maxage=600, stale-while-revalidate=3600');
    return response;
  } catch (error) {
    const failure = toMatchApiFailure(error, "WEBTOON_SEARCH_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
