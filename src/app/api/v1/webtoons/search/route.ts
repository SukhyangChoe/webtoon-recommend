import { NextResponse } from "next/server";
import { searchWebtoons } from "@/features/match/server/webtoonCatalogStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    if (query.trim().length < 1) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: await searchWebtoons(query) });
  } catch (error) {
    const failure = toMatchApiFailure(error, "WEBTOON_SEARCH_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
