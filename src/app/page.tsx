import { PageContainer } from "@/components/layout/PageContainer";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppTag } from "@/components/ui/AppTag";

export default function HomePage() {
  return (
    <PageContainer as="main" className="home-page">
      <AppCard as="section" variant="hero" className="home-hero">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">오늘 볼 웹툰이 고민될 때</p>
          <h1 className="home-hero__title">
            내 취향에 맞는 웹툰을
            <br />
            조금 더 쉽게 찾아보세요
          </h1>
          <p className="home-hero__description">
            재밌게 본 작품을 고르거나, 짧은 취향 테스트를 완료하면 지금
            보기 좋은 웹툰을 함께 찾아드려요.
          </p>
          <div className="home-hero__actions">
            <AppButton href="/find">지금 볼 웹툰 찾기</AppButton>
            <AppButton href="/tests" variant="secondary">
              취향 테스트 둘러보기
            </AppButton>
          </div>
        </div>
      </AppCard>

      <section className="home-section" aria-labelledby="home-route-heading">
        <h2 id="home-route-heading" className="home-section__heading">
          어떤 방식으로 시작할까요?
        </h2>
        <div className="home-route-grid">
          <AppCard className="home-route-card">
            <AppTag>작품으로 찾기</AppTag>
            <p className="home-route-card__label">PRIMARY</p>
            <h3 className="home-route-card__title">재밌게 본 웹툰이 있어요</h3>
            <p className="home-route-card__description">
              기억에 남은 작품을 검색하고 고르면, 닮은 결의 웹툰부터
              새로운 취향까지 이어서 보여드려요.
            </p>
            <div className="home-route-card__action">
              <AppButton href="/find" fullWidth>
                작품으로 추천받기
              </AppButton>
            </div>
          </AppCard>

          <AppCard className="home-route-card">
            <AppTag>테스트로 찾기</AppTag>
            <p className="home-route-card__label">TASTE TEST</p>
            <h3 className="home-route-card__title">내 취향부터 알아보고 싶어요</h3>
            <p className="home-route-card__description">
              대표 장르 테스트와 장르별 세부 테스트로 내가 오래 머무는
              이야기와 장면을 확인해보세요.
            </p>
            <div className="home-route-card__action">
              <AppButton href="/tests" variant="secondary" fullWidth>
                취향 테스트 시작하기
              </AppButton>
            </div>
          </AppCard>
        </div>
        <p className="home-note">
          작품 검색부터 취향 테스트, 추천 결과 복원까지 한 흐름으로 이어집니다.
        </p>
      </section>
    </PageContainer>
  );
}