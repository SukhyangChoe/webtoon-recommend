"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { StatePanel } from "@/components/ui/StatePanel";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="global-state-page">
      <PageContainer size="test" className="global-state-page__container">
        <StatePanel
          tone="error"
          eyebrow="잠시 문제가 생겼어요"
          title="화면을 불러오지 못했어요"
          description={
            "입력한 내용은 그대로 두었으니\n잠시 후 다시 시도해 주세요."
          }
          primaryAction={{
            label: "다시 시도",
            onClick: reset,
          }}
          secondaryAction={{
            label: "처음으로",
            href: "/",
          }}
        />
      </PageContainer>
    </main>
  );
}