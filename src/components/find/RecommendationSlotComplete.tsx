export function RecommendationSlotComplete() {
  return (
    <article className="recommendation-slot-complete" role="status">
      <span
        className="recommendation-slot-complete__icon"
        aria-hidden="true"
      >
        ✓
      </span>
      <div>
        <h3 className="recommendation-slot-complete__title">
          이 자리의 추천은 모두 확인했어요.
        </h3>
        <p className="recommendation-slot-complete__description">
          예비 추천을 모두 보여드렸어요. 다른 조건으로 다시 찾아볼까요?
        </p>
      </div>
    </article>
  );
}