import type { Metadata } from "next";
import { MatchAnalyticsTransport } from "@/features/match/components/MatchAnalyticsTransport";
import "./match.css";
import "./cyan-ui.css";
import "./result-ui.css";
import "./action-bar.css";
import "./relationship-ui.css";
import "./pair-ui.css";
import "./work-ui.css";
import "./typography-ui.css";
import "./share-ui.css";
import { Suspense, type CSSProperties } from "react";
import { MatchScreenHeader } from "@/features/match/components/MatchScreenHeader";
import { MATCH_UI_THEME } from "@/features/match/config/uiTheme.mjs";

export const metadata: Metadata = {
  title: "웹툰궁합",
  description: "웹툰 취향으로 알아보는 우리 둘의 웹툰궁합",
  robots: { index: false, follow: false },
};

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  const theme = Object.fromEntries(Object.entries(MATCH_UI_THEME).map(([key, value]) => [`--match-ui-${key}`, value])) as CSSProperties;
  return <div className="match-module match-cyan" style={theme}><MatchAnalyticsTransport /><Suspense fallback={<div className="match-header-placeholder" />}><MatchScreenHeader /></Suspense>{children}</div>;
}
