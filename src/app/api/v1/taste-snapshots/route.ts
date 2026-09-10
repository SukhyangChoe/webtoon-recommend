import { NextResponse } from "next/server";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";
import { createTasteSnapshot } from "@/features/match/server/resultStore";
import { toPublicTasteResult } from "@/features/match/engine/resultEngine.mjs";
import type { MatchAnswers } from "@/features/match/storage/draftTypes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { anonymousId?: string; answers?: MatchAnswers };
    if (!body.anonymousId || !isAnonymousId(body.anonymousId) || !body.answers) {
      return NextResponse.json({ error: "INVALID_TASTE_SNAPSHOT_INPUT" }, { status: 400 });
    }
    const snapshot = createTasteSnapshot(body.anonymousId, body.answers);
    return NextResponse.json(
      { publicProfileId: snapshot.publicProfileId, snapshotId: snapshot.snapshotId, result: toPublicTasteResult(snapshot) },
      { status: 201 },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "TASTE_SNAPSHOT_BUILD_FAILED";
    return NextResponse.json({ error: code }, { status: code === "GENRE_RECOVERY_REQUIRED" ? 422 : 400 });
  }
}
