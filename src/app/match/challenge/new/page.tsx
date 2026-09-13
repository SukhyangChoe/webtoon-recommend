import type { Metadata } from "next";
import { ChallengeCreator } from "@/features/match/components/ChallengeCreator";

export const metadata: Metadata = { title: "초대 링크 만들기", robots: { index: false, follow: false } };

export default function ChallengeNewPage() {
  return <main className="match-page"><ChallengeCreator /></main>;
}
