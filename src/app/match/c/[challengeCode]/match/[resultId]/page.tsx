import type { Metadata } from "next";
import { PairResultView } from "@/features/match/components/PairResultView";

export const metadata: Metadata = { title: "우리의 웹툰궁합", robots: { index: false, follow: false } };

export default async function PairResultPage({ params, searchParams }: { params: Promise<{ challengeCode: string; resultId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { challengeCode, resultId } = await params;
  const query = await searchParams;
  return <PairResultView challengeCode={challengeCode} resultId={resultId} showRankingReturn={query.from === "ranking"} />;
}
