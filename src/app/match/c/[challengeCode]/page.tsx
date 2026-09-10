import type { Metadata } from "next";
import { ChallengeLanding } from "@/features/match/components/ChallengeLanding";

export const metadata: Metadata = { title: "웹툰궁합 초대", robots: { index: false, follow: false } };

export default async function ChallengeLandingPage({ params }: { params: Promise<{ challengeCode: string }> }) {
  const { challengeCode } = await params;
  return <main className="match-page"><ChallengeLanding challengeCode={challengeCode} /></main>;
}
