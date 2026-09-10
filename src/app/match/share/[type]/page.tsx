import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharePreview } from "@/features/match/components/SharePreview";

export const metadata: Metadata = { title: "웹툰궁합 공유", robots: { index: false, follow: false } };

export default async function MatchSharePage({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { type } = await params;
  if (type !== "personal" && type !== "pair" && type !== "ranking") notFound();
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  return <SharePreview
    type={type}
    profilePublicId={first(query.profilePublicId)}
    challengeCode={first(query.challengeCode)}
    resultId={first(query.resultId)}
  />;
}
