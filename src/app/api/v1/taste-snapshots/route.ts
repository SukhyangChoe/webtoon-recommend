import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { createTasteSnapshot } from "@/features/match/server/resultStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";
import { toPublicTasteResult } from "@/features/match/engine/resultEngine.mjs";
import type { MatchAnswers } from "@/features/match/storage/draftTypes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { anonymousId?: string; nickname?: string; answers?: MatchAnswers };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.nickname || !body.answers) {
      return NextResponse.json({ error: "INVALID_TASTE_SNAPSHOT_INPUT" }, { status: 400 });
    }
    const snapshot = await createTasteSnapshot(body.anonymousId, body.nickname, body.answers);
    return NextResponse.json(
      { publicProfileId: snapshot.publicProfileId, snapshotId: snapshot.snapshotId, result: { ...toPublicTasteResult(snapshot), nickname: snapshot.profileDisplayName ?? null } },
      { status: 201 },
    );
  } catch (error) {
    const failure = toMatchApiFailure(error, "TASTE_SNAPSHOT_BUILD_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
