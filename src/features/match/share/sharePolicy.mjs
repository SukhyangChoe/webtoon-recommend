export const MATCH_SHARE_COPY_VERSION = "webtoon_match_result_copy_v0_1_candidate";
export const THREADS_INTENT_BASE = "https://www.threads.com/intent/post";

function joined(items, empty) {
  return items?.length ? items.join(" · ") : empty;
}

export function withShareUtm(url, content) {
  const tagged = new URL(url);
  tagged.searchParams.set("utm_source", "threads");
  tagged.searchParams.set("utm_medium", "social");
  tagged.searchParams.set("utm_campaign", "webtoon_match");
  tagged.searchParams.set("utm_content", content);
  return tagged.toString();
}

export function threadsIntentUrl(text) {
  const intent = new URL(THREADS_INTENT_BASE);
  intent.searchParams.set("text", text);
  return intent.toString();
}

export function personalShareCopy({ topGenres, wellMatchedLabels, lessMatchedLabels, challengeUrl }) {
  const shareUrl = withShareUtm(challengeUrl, "personal");
  const topGenre = topGenres[0]?.displayLabel ?? "웹툰";
  return {
    templateKey: "personal_invite_primary",
    shareUrl,
    text: `내 웹툰 취향은 ${topGenre} 쪽에 별이 제일 많이 모였어.\n\n잘 보는 쪽\n${joined(wellMatchedLabels, "딱히 크게 가리지 않음")}\n\n덜 맞는 쪽\n${joined(lessMatchedLabels, "딱히 크게 가리는 쪽 없음")}\n\n나랑 웹툰궁합 몇 % 나오는지 해볼래?\n${shareUrl}`,
  };
}

export function pairShareCopy({ ownerNickname, challengerNickname, score, bandLabel, sharedGenres, differentGenres, trustSentence, pairUrl }) {
  const shareUrl = withShareUtm(pairUrl, "pair");
  return {
    templateKey: "pair_result_primary",
    shareUrl,
    text: `${ownerNickname}님이랑 웹툰궁합 ${score}% — ${bandLabel}\n\n둘 다 잘 보는 장르\n${joined(sharedGenres, "딱 겹치는 주력 장르는 적어")}\n\n여기서 갈림\n${joined(differentGenres, "장르 분포까지 거의 비슷해")}\n\n${trustSentence}\n${shareUrl}`,
    cardTitle: `${ownerNickname} × ${challengerNickname}`,
  };
}

export function rankingShareCopy({ topEntry, challengeUrl }) {
  const shareUrl = withShareUtm(challengeUrl, "ranking_initial");
  const body = topEntry
    ? `현재 1위는 ${topEntry.nickname} ${topEntry.score}%!\n이거 넘을 사람 있나 👀`
    : "아직 첫 1위를 기다리는 중이야.\n누가 나랑 가장 잘 맞을까?";
  return {
    templateKey: "ranking_initial_primary",
    shareUrl,
    text: `내 웹툰궁합 랭킹 열었어.\n${body}\n${shareUrl}`,
  };
}
