import { PageContainer } from "@/components/layout/PageContainer";
import { StatePanel } from "@/components/ui/StatePanel";

export default function NotFound() {
  return (
    <main className="global-state-page">
      <PageContainer size="test" className="global-state-page__container">
        <StatePanel
          tone="empty"
          eyebrow="페이지를 찾지 못했어요"
          title="요청한 화면이 없어요"
          description="주소를 다시 확인하거나 처음 화면에서 이어서 이용해 주세요."
          primaryAction={{
            label: "처음으로",
            href: "/",
          }}
          secondaryAction={{
            label: "웹툰 찾기",
            href: "/find",
          }}
        />
      </PageContainer>
    </main>
  );
}