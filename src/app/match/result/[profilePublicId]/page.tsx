import type { Metadata } from "next";
import { MatchResultView } from "@/features/match/components/MatchResultView";

export const metadata: Metadata = { title: "내 웹툰 취향", robots: { index: false, follow: false } };

export default async function MatchResultPage({ params, searchParams }: { params: Promise<{ profilePublicId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { profilePublicId } = await params;
  const query = await searchParams;
  return <MatchResultView publicProfileId={profilePublicId} showPairResultPrompt={query.from !== "home"} />;
}
