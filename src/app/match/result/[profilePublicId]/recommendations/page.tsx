import type { Metadata } from "next";
import { RecommendationManager } from "@/features/match/components/RecommendationManager";
import { getProfileRecommendations } from "@/features/match/server/webtoonCatalogStore";

export const metadata: Metadata = { title: "내 추천작 관리", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MatchRecommendationsPage({ params, searchParams }: { params: Promise<{ profilePublicId: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const { profilePublicId } = await params;
  const initialSelected = await getProfileRecommendations(profilePublicId).catch(() => null);
  const query = await searchParams;
  return <RecommendationManager publicProfileId={profilePublicId} returnTo={typeof query.returnTo === 'string' ? query.returnTo : undefined} initialSelected={initialSelected ?? []} initialLoadFailed={initialSelected === null} />;
}
