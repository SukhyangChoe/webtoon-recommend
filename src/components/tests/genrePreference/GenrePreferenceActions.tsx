"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";

export default function GenrePreferenceActions({
  onRetake,
  shareText,
}: {
  onRetake: () => void;
  shareText: string;
}) {
  const [shareMessage, setShareMessage] = useState("");

  async function handleShare() {
    const shareData = {
      title: "내 웹툰 세계관 지도",
      text: shareText,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("공유 화면을 열었어요.");
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        setShareMessage("결과 링크를 복사했어요.");
        return;
      }

      setShareMessage("이 브라우저에서는 공유 기능을 사용할 수 없어요.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareMessage("");
        return;
      }

      setShareMessage("공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <section className="genre-result-actions" aria-label="결과 다음 행동">
      <div className="genre-result-actions__primary">
        <p>이제 취향에 맞는 웹툰을 찾아볼까요?</p>
        <AppButton href="/find" fullWidth>
          이 취향으로 웹툰 추천받기
        </AppButton>
      </div>

      <div className="genre-result-actions__secondary">
        <AppButton variant="secondary" onClick={handleShare}>
          결과 공유하기
        </AppButton>
        <AppButton href="/tests" variant="secondary">
          다른 테스트 보기
        </AppButton>
        <button
          type="button"
          className="genre-result-actions__retake"
          onClick={onRetake}
        >
          다시 테스트하기
        </button>
      </div>

      <p className="genre-result-actions__message" aria-live="polite">
        {shareMessage}
      </p>
    </section>
  );
}