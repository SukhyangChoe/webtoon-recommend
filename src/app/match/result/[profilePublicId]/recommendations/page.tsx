import type { Metadata } from "next";
import { RecommendationManager } from "@/features/match/components/RecommendationManager";
import { getProfileRecommendations } from "@/features/match/server/webtoonCatalogStore";

export const metadata: Metadata = { title: "내 추천작 관리", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MatchRecommendationsPage({ params }: { params: Promise<{ profilePublicId: string }> }) {
  const { profilePublicId } = await params;
  const initialSelected = await getProfileRecommendations(profilePublicId).catch(() => null);
  return <RecommendationManager publicProfileId={profilePublicId} initialSelected={initialSelected ?? []} initialLoadFailed={initialSelected === null} />;
}
