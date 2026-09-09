import { MATCH_CONFIG_STATUS, MATCH_VERSIONS } from "./versions.mjs";

const DEFAULT_BASE_URL = "http://localhost:3000/match";

export type MatchRuntimeConfig = {
  baseUrl: string;
  status: typeof MATCH_CONFIG_STATUS;
  versions: typeof MATCH_VERSIONS;
};

export function loadMatchConfig(): MatchRuntimeConfig {
  const configuredUrl = process.env.NEXT_PUBLIC_WEBTOON_MATCH_BASE_URL?.trim();

  return {
    baseUrl: configuredUrl || DEFAULT_BASE_URL,
    status: MATCH_CONFIG_STATUS,
    versions: MATCH_VERSIONS,
  };
}

export { MATCH_CONFIG_STATUS, MATCH_VERSIONS };
