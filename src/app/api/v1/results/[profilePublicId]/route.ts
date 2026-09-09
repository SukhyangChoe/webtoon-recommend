import { NextResponse } from "next/server";
import { getPublicTasteResult, saveAccuracyFeedback, type AccuracyFeedback } from "@/features/match/server/resultStore";

export const dynamic = "force-dynamic";
const FEEDBACK = new Set<AccuracyFeedback>(["almost_exact", "mostly_right", "slightly_off", "very_off"]);

export async function GET(_request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  const { profilePublicId } = await params;
  const result = getPublicTasteResult(profilePublicId);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "RESULT_NOT_FOUND" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  const { profilePublicId } = await params;
  const body = (await request.json()) as { anonymousId?: string; feedback?: AccuracyFeedback };
  if (!body.anonymousId || !body.feedback || !FEEDBACK.has(body.feedback)) return NextResponse.json({ error: "INVALID_FEEDBACK" }, { status: 400 });
  return saveAccuracyFeedback(profilePublicId, body.anonymousId, body.feedback)
    ? NextResponse.json({ saved: true })
    : NextResponse.json({ error: "RESULT_OWNER_MISMATCH" }, { status: 403 });
}
