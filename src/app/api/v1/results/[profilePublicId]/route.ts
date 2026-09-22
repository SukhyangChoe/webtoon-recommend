import { NextResponse } from "next/server";
import { getPublicTasteResult, isTasteResultOwner, saveAccuracyFeedback, type AccuracyFeedback } from "@/features/match/server/resultStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";

export const dynamic = "force-dynamic";
const FEEDBACK = new Set<AccuracyFeedback>(["almost_exact", "mostly_right", "slightly_off", "very_off"]);

export async function GET(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const result = await getPublicTasteResult(profilePublicId);
    if (!result) return NextResponse.json({ error: "RESULT_NOT_FOUND" }, { status: 404 });
    const anonymousId = new URL(request.url).searchParams.get("anonymousId");
    const canManage = Boolean(anonymousId && isAnonymousId(anonymousId) && await isTasteResultOwner(profilePublicId, anonymousId));
    return NextResponse.json({ ...result, canManage });
  } catch (error) {
    const failure = toMatchApiFailure(error, "RESULT_LOAD_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const body = (await request.json()) as { anonymousId?: string; feedback?: AccuracyFeedback };
    if (!body.anonymousId || !body.feedback || !FEEDBACK.has(body.feedback)) return NextResponse.json({ error: "INVALID_FEEDBACK" }, { status: 400 });
    return await saveAccuracyFeedback(profilePublicId, body.anonymousId, body.feedback)
      ? NextResponse.json({ saved: true })
      : NextResponse.json({ error: "RESULT_OWNER_MISMATCH" }, { status: 403 });
  } catch (error) {
    const failure = toMatchApiFailure(error, "FEEDBACK_SAVE_FAILED");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
