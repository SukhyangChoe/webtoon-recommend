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
    text: `내 웹툰 본캐는 ‘${archetypeName ?? "다음 화 버튼 수호자"}’!\n${topGenre} 쪽에 별이 제일 많이 모였어.\n\n끌리는 요소\n${joined(wellMatchedLabels, "딱히 크게 가리지 않음")}\n\n조금 망설이는 요소\n${joined(lessMatchedLabels, "딱히 망설이는 요소 없음")}\n\n너랑은 어떤 웹툰 관계 타입일까?\n${shareUrl}`,
  };
}

export function pairShareCopy({ ownerNickname, challengerNickname, score, bandLabel, sharedGenres, differentGenres, ownerRecommendedGenres, challengerRecommendedGenres, trustSentence, pairUrl, archetypeName }) {
  const shareUrl = withShareUtm(pairUrl, "pair");
  const ownerPicks = ownerRecommendedGenres ?? differentGenres;
  const challengerPicks = challengerRecommendedGenres ?? [];
  const recommendations = [
    { from: ownerNickname, to: challengerNickname, genres: ownerPicks },
    { from: challengerNickname, to: ownerNickname, genres: challengerPicks },
  ].filter((item) => item.genres?.length)
    .map((item) => `${item.from} → ${item.to}: ${item.genres.join(" · ")}`);
  const recommendationCopy = recommendations.length ? `\n\n각자 영업할 장르\n${recommendations.join("\n")}` : "";
  return {
    templateKey: "pair_result_primary",
    shareUrl,
    text: `${ownerNickname} × ${challengerNickname}\n우리 웹툰 관계 타입은 ‘${archetypeName ?? bandLabel}’! (${score}%)\n\n같이 달릴 장르\n${joined(sharedGenres, "서로의 새 장르 개척하기")}${recommendationCopy}\n\n${trustSentence}\n${shareUrl}`,
    cardTitle: `${ownerNickname} × ${challengerNickname}`,
  };
}

export function rankingShareCopy({ topEntry, challengeUrl }) {
  const shareUrl = withShareUtm(challengeUrl, "ranking_initial");
  const body = topEntry
    ? `현재 1위는 ${topEntry.nickname} ${topEntry.score}%!\n이 점수 넘을 사람 있나?`
    : "아직 첫 1위를 기다리는 중이야.\n누가 나랑 가장 잘 맞을까?";
  return {
    templateKey: "ranking_initial_primary",
    shareUrl,
    text: `내 웹툰 취향 왕좌를 열었어.\n${body}\n${shareUrl}`,
  };
}
