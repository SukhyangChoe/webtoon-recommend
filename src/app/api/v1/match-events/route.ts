import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { storeMatchAnalyticsEvents } from "@/features/match/server/analyticsStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { anonymousId?: string; events?: unknown };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId)) {
      return NextResponse.json({ error: "INVALID_ANALYTICS_INPUT" }, { status: 400 });
    }
    const stored = await storeMatchAnalyticsEvents(body.anonymousId, body.events);
    return NextResponse.json(stored, { status: 202 });
  } catch (error) {
    const failure = toMatchApiFailure(error, "ANALYTICS_STORE_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
