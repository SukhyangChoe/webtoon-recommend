export type AuthProvider = "kakao";

export type AuthUser = {
  provider: AuthProvider;
  providerUserId: string;
  nickname?: string;
  profileImageUrl?: string;
};

export type AuthSessionStatus =
  | "anonymous"
  | "loading"
  | "authenticated"
  | "error";

export type AuthSession = {
  status: AuthSessionStatus;
  user: AuthUser | null;
  errorMessage?: string;
};