import { NextResponse } from "next/server";
import { getPublicPairResult } from "@/features/match/server/challengeStore";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ challengeCode: string; resultId: string }> }) {
  const { challengeCode, resultId } = await params;
  const result = await getPublicPairResult(challengeCode, resultId);
  if (!result) return NextResponse.json({ error: "PAIR_RESULT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(result);
}
