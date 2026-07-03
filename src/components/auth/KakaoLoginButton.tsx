"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import {
  KAKAO_LOGIN_READY_MESSAGE,
  startKakaoLogin,
} from "@/lib/auth/kakaoAuth";

type KakaoLoginButtonProps = {
  className?: string;
  style?: CSSProperties;
  label?: string;
  showInlineMessage?: boolean;
};

export default function KakaoLoginButton({
  className,
  style,
  label = "카카오로 시작하기",
  showInlineMessage = true,
}: KakaoLoginButtonProps) {
  const [message, setMessage] = useState("");

  function handleClick() {
    const result = startKakaoLogin();

    setMessage(result.message || KAKAO_LOGIN_READY_MESSAGE);
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        style={{
          width: "100%",
          minHeight: 52,
          border: "none",
          borderRadius: 16,
          background: "#FEE500",
          color: "#111827",
          fontSize: 16,
          fontWeight: 800,
          cursor: "pointer",
          ...style,
        }}
      >
        {label}
      </button>

      {showInlineMessage && message ? (
        <p
          role="status"
          style={{
            margin: 0,
            color: "#94a3b8",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}