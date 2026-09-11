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

export function personalShareCopy({ topGenres, wellMatchedLabels, lessMatchedLabels, challengeUrl, archetypeName }) {
  const shareUrl = withShareUtm(challengeUrl, "personal");
  const topGenre = topGenres[0]?.displayLabel ?? "웹툰";
  return {
    templateKey: "personal_invite_primary",
    shareUrl,
    text: `내 웹툰 본캐는 ‘${archetypeName ?? "다음 화 버튼 수호자"}’!\n${topGenre} 쪽에 별이 제일 많이 모였어.\n\n잘 보는 쪽\n${joined(wellMatchedLabels, "딱히 크게 가리지 않음")}\n\n덜 맞는 쪽\n${joined(lessMatchedLabels, "딱히 크게 가리는 쪽 없음")}\n\n너랑은 어떤 웹툰 관계 타입일까?\n${shareUrl}`,
  };
}

export function pairShareCopy({ ownerNickname, challengerNickname, score, bandLabel, sharedGenres, differentGenres, trustSentence, pairUrl, archetypeName }) {
  const shareUrl = withShareUtm(pairUrl, "pair");
  return {
    templateKey: "pair_result_primary",
    shareUrl,
    text: `${ownerNickname} × ${challengerNickname}\n우리 웹툰 관계 타입은 ‘${archetypeName ?? bandLabel}’! (${score}%)\n\n같이 달릴 장르\n${joined(sharedGenres, "서로의 새 장르 개척하기")}\n\n각자 영업할 장르\n${joined(differentGenres, "거의 한마음")}\n\n${trustSentence}\n${shareUrl}`,
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
    text: `내 웹툰 취향 왕좌를 열었어.\n${body}\n${shareUrl}`,
  };
}
