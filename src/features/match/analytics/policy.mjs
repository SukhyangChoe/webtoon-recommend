export const MATCH_ANALYTICS_VERSION = "webtoon_match_analytics_v0_1_candidate";

export const MATCH_EVENT_NAMES = Object.freeze([
  "wm_landing_view",
  "wm_challenge_landing_view",
  "wm_test_start",
  "wm_section_view",
  "wm_answer_select",
  "wm_test_complete",
  "wm_result_view",
  "wm_challenge_create",
  "wm_share_intent_click",
  "wm_share_fallback",
  "wm_pair_result_view",
  "wm_ranking_view",
  "wm_ranking_share_click",
  "wm_accuracy_feedback",
  "wm_owner_hide_entry",
]);

const EVENT_NAMES = new Set(MATCH_EVENT_NAMES);
const BLOCKED_PROPERTY_PATTERN = /(nickname|answer|vector|raw|token|email|phone|contact|name)/i;

const PROPERTY_KEYS = Object.freeze({
  wm_landing_view: ["entryType", "referrerHost", "utmSource", "utmMedium", "utmCampaign", "utmContent"],
  wm_challenge_landing_view: ["challengeCode", "referrerHost"],
  wm_test_start: ["entryType", "challengeCode"],
  wm_section_view: ["sectionKey", "elapsedMs", "questionSetVersion"],
  wm_answer_select: ["questionId", "choiceKey", "selected", "selectionRole", "swapped", "sidePlacementVersion"],
  wm_test_complete: ["durationMs", "testVersion", "questionSetVersion", "entryType", "topGenre", "starConcentration", "settingSelectionCount", "settingIndifferent"],
  wm_result_view: ["topGenre", "starConcentration"],
  wm_challenge_create: ["challengeCode", "rankingVisibility"],
  wm_share_intent_click: ["shareType", "templateKey"],
  wm_share_fallback: ["shareType", "action"],
  wm_pair_result_view: ["challengeCode", "scoreBand", "rank"],
  wm_ranking_view: ["challengeCode", "entryCount", "viewerRank", "canManage"],
  wm_ranking_share_click: ["shareType", "reason"],
  wm_accuracy_feedback: ["rating"],
  wm_owner_hide_entry: ["challengeCode", "hidden"],
});

const PROPERTY_LIMITS = Object.freeze({
  elapsedMs: [0, 1_800_000],
  durationMs: [0, 1_800_000],
  starConcentration: [0, 18],
  settingSelectionCount: [0, 4],
  rank: [0, 1_000_000],
  viewerRank: [0, 1_000_000],
  entryCount: [0, 1_000_000],
});

export function isMatchEventName(value) {
  return typeof value === "string" && EVENT_NAMES.has(value);
}

export function sanitizeMatchEventProperties(eventName, properties = {}) {
  if (!isMatchEventName(eventName) || !properties || typeof properties !== "object" || Array.isArray(properties)) return {};
  const allowed = new Set(PROPERTY_KEYS[eventName] ?? []);
  const sanitized = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.has(key) || BLOCKED_PROPERTY_PATTERN.test(key)) continue;
    if (typeof value === "string") {
      const normalized = value.trim();
      if (normalized) sanitized[key] = normalized.slice(0, key === "questionId" ? 120 : 80);
      continue;
    }
    if (typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const [minimum, maximum] = PROPERTY_LIMITS[key] ?? [-1_000_000, 1_000_000];
      sanitized[key] = Math.max(minimum, Math.min(maximum, Math.round(value)));
    }
  }

  return sanitized;
}
