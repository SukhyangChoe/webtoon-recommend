import type { Metadata } from "next";
import { ChallengeRankingView } from "@/features/match/components/ChallengeRankingView";

export const metadata: Metadata = { title: "웹툰궁합 랭킹", robots: { index: false, follow: false } };

export default async function ChallengeRankingPage({ params }: { params: Promise<{ challengeCode: string }> }) {
  const { challengeCode } = await params;
  return <ChallengeRankingView challengeCode={challengeCode} />;
}
