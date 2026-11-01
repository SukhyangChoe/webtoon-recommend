import type { Metadata } from "next";
import { MatchResultView } from "@/features/match/components/MatchResultView";

export const metadata: Metadata = { title: "내 웹툰 취향", robots: { index: false, follow: false } };

export default async function MatchResultPage({ params }: { params: Promise<{ profilePublicId: string }> }) {
  const { profilePublicId } = await params;
  return <MatchResultView publicProfileId={profilePublicId} />;
}
