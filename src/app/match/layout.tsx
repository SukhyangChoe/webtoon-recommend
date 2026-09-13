import type { Metadata } from "next";
import { MatchAnalyticsTransport } from "@/features/match/components/MatchAnalyticsTransport";
import "./match.css";

export const metadata: Metadata = {
  title: "웹툰궁합",
  description: "18개의 취향별로 알아보는 우리 둘의 웹툰궁합",
  robots: { index: false, follow: false },
};

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return <div className="match-module"><MatchAnalyticsTransport />{children}</div>;
}
