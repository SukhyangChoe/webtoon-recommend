export function RecommendationSlotComplete({
    slotLabel,
  }: {
    slotLabel: string;
  }) {
    return (
      <article
        role="status"
        style={{
          borderRadius: 24,
          border: "1px dashed #cbd5e1",
          background: "#f8fafc",
          padding: "clamp(20px, 5vw, 30px)",
          display: "grid",
          gap: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#6366f1",
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          {slotLabel}
        </p>
  
        <h4
          style={{
            margin: 0,
            color: "#334155",
            fontSize: 18,
            lineHeight: 1.45,
            letterSpacing: "-0.02em",
          }}
        >
          이 슬롯의 추천은 모두 확인했어요.
        </h4>
  
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          예비 추천을 모두 보여드렸어요. 다른 조건으로 다시 찾아볼까요?
        </p>
      </article>
    );
  }