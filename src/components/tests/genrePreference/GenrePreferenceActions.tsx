"use client";

export default function GenrePreferenceActions({
  onRetake,
}: {
  onRetake: () => void;
}) {
  return (
    <section
      style={{
        marginTop: 20,
        display: "grid",
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={() => alert("결과 공유 기능은 이후 단계에서 연결됩니다.")}
        style={{
          width: "100%",
          borderRadius: 16,
          border: "1px solid #c7d2fe",
          background: "#ffffff",
          color: "#4338ca",
          padding: "14px 16px",
          fontSize: 15,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        결과 공유하기
      </button>

      <button
        type="button"
        onClick={() =>
          alert("이 취향으로 웹툰 추천받기는 이후 /find와 연결됩니다.")
        }
        style={{
          width: "100%",
          borderRadius: 16,
          border: "none",
          background: "#4f46e5",
          color: "#ffffff",
          padding: "14px 16px",
          fontSize: 15,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        이 취향으로 웹툰 추천받기
      </button>

      <button
        type="button"
        onClick={onRetake}
        style={{
          width: "100%",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          color: "#334155",
          padding: "13px 16px",
          fontSize: 14,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        다시 테스트하기
      </button>
    </section>
  );
}