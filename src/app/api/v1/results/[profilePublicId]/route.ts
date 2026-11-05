import { readMatchJson } from '@/features/match/server/requestBody';
import { matchJson } from '@/features/match/server/apiResponse';
import { getPublicTasteResultForViewer, saveAccuracyFeedback, type AccuracyFeedback } from "@/features/match/server/resultStore";
import { toMatchApiFailure } from "@/features/match/server/apiErrors";
import { isAnonymousId } from "@/features/match/storage/anonymousIdentity.mjs";

export const dynamic = "force-dynamic";
const FEEDBACK = new Set<AccuracyFeedback>(["almost_exact", "mostly_right", "slightly_off", "very_off"]);

export async function GET(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const anonymousId = new URL(request.url).searchParams.get("anonymousId");
    const result = await getPublicTasteResultForViewer(profilePublicId, anonymousId && isAnonymousId(anonymousId) ? anonymousId.toLowerCase() : null);
    if (!result) return matchJson(request, { error: "RESULT_NOT_FOUND" }, { status: 404 });
    return matchJson(request, result);
  } catch (error) {
    const failure = toMatchApiFailure(error, "RESULT_LOAD_FAILED");
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ profilePublicId: string }> }) {
  try {
    const { profilePublicId } = await params;
    const body = (await readMatchJson(request)) as { anonymousId?: string; feedback?: AccuracyFeedback };
    if (!body.anonymousId || !body.feedback || !FEEDBACK.has(body.feedback)) return matchJson(request, { error: "INVALID_FEEDBACK" }, { status: 400 });
    return await saveAccuracyFeedback(profilePublicId, body.anonymousId, body.feedback)
      ? matchJson(request, { saved: true })
      : matchJson(request, { error: "RESULT_OWNER_MISMATCH" }, { status: 403 });
  } catch (error) {
    const failure = toMatchApiFailure(error, "FEEDBACK_SAVE_FAILED");
    return matchJson(request, { error: failure.error }, { status: failure.status });
  }
}
