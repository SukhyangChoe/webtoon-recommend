import test from "node:test";
import assert from "node:assert/strict";
import { MATCH_EVENT_QUEUE_KEY, recordMatchEvent } from "../../src/features/match/analytics/events.mjs";
import { pairArchetypeFor, personalArchetypeFor } from "../../src/features/match/share/shareArchetypes.mjs";
import { pairTrustSentence } from "../../src/features/match/share/pairTrustCopy.mjs";
import { pairShareCopy, personalShareCopy, rankingShareCopy, threadsIntentUrl } from "../../src/features/match/share/sharePolicy.mjs";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("personal sharing uses the challenge URL and required Threads UTM", () => {
  const copy = personalShareCopy({
    topGenres: [{ displayLabel: "판타지" }],
    wellMatchedLabels: ["성장", "시스템"],
    lessMatchedLabels: [],
    archetypeName: "회귀 버튼 단골손님",
    challengeUrl: "https://example.com/match/c/code123",
  });
  const url = new URL(copy.shareUrl);
  assert.equal(url.pathname, "/match/c/code123");
  assert.equal(url.searchParams.get("utm_source"), "threads");
  assert.equal(url.searchParams.get("utm_content"), "personal");
  assert.match(copy.text, /판타지/);
  assert.match(copy.text, /회귀 버튼 단골손님/);
  assert.match(copy.text, /끌리는 요소/);
  assert.match(copy.text, /조금 망설이는 요소/);
  assert.ok(copy.text.length < 500);
});

test("pair and ranking sharing preserve their intended destinations", () => {
  const pair = pairShareCopy({
    ownerNickname: "주인", challengerNickname: "도전자", score: 88, bandLabel: "취향 잘 맞음",
    sharedGenres: ["판타지"], differentGenres: ["로맨스"], ownerRecommendedGenres: ["로맨스"], challengerRecommendedGenres: ["무협"], trustSentence: "추천을 믿을 만해.",
    archetypeName: "밤샘 정주행 메이트",
    pairUrl: "https://example.com/match/c/code/match/result",
  });
  const ranking = rankingShareCopy({
    topEntry: { nickname: "도전자", score: 88 }, challengeUrl: "https://example.com/match/c/code",
  });
  assert.equal(new URL(pair.shareUrl).pathname, "/match/c/code/match/result");
  assert.equal(new URL(ranking.shareUrl).pathname, "/match/c/code");
  assert.equal(new URL(pair.shareUrl).searchParams.get("utm_content"), "pair");
  assert.equal(new URL(ranking.shareUrl).searchParams.get("utm_content"), "ranking_initial");
  assert.match(pair.text, /밤샘 정주행 메이트/);
  assert.match(pair.text, /주인 → 도전자: 로맨스/);
  assert.match(pair.text, /도전자 → 주인: 무협/);
  assert.ok(pair.text.length < 500);
  assert.ok(ranking.text.length < 500);
});

test("pair recommendation copy omits empty directions", () => {
  const pair = pairShareCopy({
    ownerNickname: "주인", challengerNickname: "도전자", score: 60, bandLabel: "장르 따라 잘 맞음",
    sharedGenres: ["판타지"], ownerRecommendedGenres: ["로맨스"], challengerRecommendedGenres: [],
    trustSentence: "추천 문구", pairUrl: "https://example.com/match/c/code/match/result",
  });
  assert.match(pair.text, /주인 → 도전자: 로맨스/);
  assert.doesNotMatch(pair.text, /도전자 → 주인/);
  assert.doesNotMatch(pair.text, /뚜렷한 장르 없음/);
});

test("pair trust copy gets stronger with the compatibility score", () => {
  assert.match(pairTrustSentence({ score: 92, recommenderNickname: "주인" }), /최근 본 목록/);
  assert.match(pairTrustSentence({ score: 84, recommenderNickname: "주인" }), /첫 3화/);
  assert.match(pairTrustSentence({ score: 74, recommenderNickname: "주인", genre: "무협" }), /무협/);
  assert.match(pairTrustSentence({ score: 28, recommenderNickname: "주인" }), /각자 볼 것/);
});

test("pair relation types cover every score band and clamp outliers", () => {
  assert.equal(pairArchetypeFor(100).name, "최애작 공동명의");
  assert.equal(pairArchetypeFor(90).name, "최애작 공동명의");
  assert.equal(pairArchetypeFor(89).name, "밤샘 정주행 메이트");
  assert.equal(pairArchetypeFor(79).name, "추천 적중 보증수표");
  assert.equal(pairArchetypeFor(69).name, "장르 교환 원정대");
  assert.equal(pairArchetypeFor(54).name, "취향 맞다이 라이벌");
  assert.equal(pairArchetypeFor(39).name, "반대편 서가 안내자");
  assert.equal(pairArchetypeFor(-12).name, "반대편 서가 안내자");
  assert.equal(pairArchetypeFor(140).name, "최애작 공동명의");
});

test("personal webtoon personas follow the leading genre", () => {
  assert.equal(personalArchetypeFor("fantasy").name, "회귀 버튼 단골손님");
  assert.equal(personalArchetypeFor("romance").name, "심쿵 장면 수집가");
  assert.equal(personalArchetypeFor("unknown").name, "다음 화 버튼 수호자");
  const genreKeys = ["fantasy", "murim", "romance", "ropan", "action", "thriller_horror", "drama_daily", "comedy", "sports"];
  const imageSources = genreKeys.map((genreKey) => personalArchetypeFor(genreKey).imageSrc);
  assert.equal(new Set(imageSources).size, genreKeys.length);
  assert.ok(imageSources.every((src) => src.startsWith("/match/personas/") && src.endsWith(".png")));
});

test("Threads intent carries the complete prepared text", () => {
  const text = "웹툰궁합 88%\nhttps://example.com/match/c/code";
  const intent = new URL(threadsIntentUrl(text));
  assert.equal(intent.origin, "https://www.threads.com");
  assert.equal(intent.pathname, "/intent/post");
  assert.equal(intent.searchParams.get("text"), text);
});

test("share event queue excludes sensitive properties and stays bounded", () => {
  const storage = memoryStorage();
  assert.equal(recordMatchEvent(storage, "unknown", {}), false);
  for (let index = 0; index < 205; index += 1) {
    recordMatchEvent(storage, "wm_share_fallback", {
      shareType: "personal", action: "link", nickname: "숨겨야 함", rawAnswer: "숨겨야 함", index,
    }, () => "2026-09-10T00:00:00.000Z");
  }
  const queue = JSON.parse(storage.getItem(MATCH_EVENT_QUEUE_KEY));
  assert.equal(queue.length, 200);
  assert.deepEqual(queue.at(-1).properties, { shareType: "personal", action: "link" });
});
