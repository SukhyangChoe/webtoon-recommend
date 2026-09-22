import type { Metadata } from "next";
import { RecommendationManager } from "@/features/match/components/RecommendationManager";

export const metadata: Metadata = { title: "내 추천작 관리", robots: { index: false, follow: false } };

export default async function MatchRecommendationsPage({ params }: { params: Promise<{ profilePublicId: string }> }) {
  const { profilePublicId } = await params;
  return <RecommendationManager publicProfileId={profilePublicId} />;
}
