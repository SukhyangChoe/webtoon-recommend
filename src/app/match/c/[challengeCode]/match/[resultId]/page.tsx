import type { Metadata } from "next";
import { PairResultView } from "@/features/match/components/PairResultView";

export const metadata: Metadata = { title: "우리의 웹툰궁합", robots: { index: false, follow: false } };

export default async function PairResultPage({ params }: { params: Promise<{ challengeCode: string; resultId: string }> }) {
  const { challengeCode, resultId } = await params;
  return <PairResultView challengeCode={challengeCode} resultId={resultId} />;
}
