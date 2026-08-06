import type { Metadata } from "next";
import { BrandBar } from "../components/layout/BrandBar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "웹툰핏",
    template: "%s | 웹툰핏",
  },
  description: "재밌게 본 작품과 취향 테스트를 바탕으로 지금 볼 웹툰을 찾아보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <BrandBar />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}