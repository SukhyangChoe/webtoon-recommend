import type { Metadata } from "next";
import { ChallengeLanding } from "@/features/match/components/ChallengeLanding";
import { getChallengeInviteMetadata } from "@/features/match/server/challengeStore";

const fallbackMetadata: Metadata = {
  title: "웹툰궁합 초대",
  description: "친구와 웹툰 취향을 비교하고 둘의 웹툰궁합을 확인해 보세요.",
  robots: { index: false, follow: false },
};

export async function generateMetadata({ params }: { params: Promise<{ challengeCode: string }> }): Promise<Metadata> {
  try {
    const { challengeCode } = await params;
    const challenge = await getChallengeInviteMetadata(challengeCode);
    if (!challenge || challenge.status !== "active") return fallbackMetadata;

    const title = `${challenge.ownerNickname}님과 웹툰궁합 보기`;
    const description = `${challenge.ownerNickname}님과 웹툰 취향을 비교하고 둘의 웹툰궁합을 확인해 보세요.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
      twitter: { card: "summary", title, description },
      robots: { index: false, follow: false },
    };
  } catch {
    return fallbackMetadata;
  }
}

export default async function ChallengeLandingPage({ params }: { params: Promise<{ challengeCode: string }> }) {
  const { challengeCode } = await params;
  return <main className="match-page"><ChallengeLanding challengeCode={challengeCode} /></main>;
}
