import { PageContainer } from "@/components/layout/PageContainer";
import { StatePanel } from "@/components/ui/StatePanel";

export default function Loading() {
  return (
    <main className="global-state-page">
      <PageContainer size="test" className="global-state-page__container">
        <StatePanel
          tone="loading"
          eyebrow="화면을 준비하고 있어요"
          title="잠시만 기다려 주세요"
          description="입력한 내용은 그대로 유지하고 있어요."
        />
      </PageContainer>
    </main>
  );
}