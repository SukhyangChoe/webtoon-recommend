import type { AuthUser } from "./authTypes";

export const KAKAO_LOGIN_READY_MESSAGE =
  "카카오 로그인은 다음 단계에서 연결됩니다.";

export type KakaoAuthStartResult = {
  ok: false;
  message: string;
};

export function startKakaoLogin(): KakaoAuthStartResult {
  return {
    ok: false,
    message: KAKAO_LOGIN_READY_MESSAGE,
  };
}

export function getCurrentAuthUser(): AuthUser | null {
  return null;
}

export function logoutKakaoUser() {
  return {
    ok: true,
  };
}