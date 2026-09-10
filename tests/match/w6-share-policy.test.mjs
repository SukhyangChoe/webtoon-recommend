import test from "node:test";
import assert from "node:assert/strict";
import { MATCH_EVENT_QUEUE_KEY, recordMatchEvent } from "../../src/features/match/analytics/events.mjs";
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
    challengeUrl: "https://example.com/match/c/code123",
  });
  const url = new URL(copy.shareUrl);
  assert.equal(url.pathname, "/match/c/code123");
  assert.equal(url.searchParams.get("utm_source"), "threads");
  assert.equal(url.searchParams.get("utm_content"), "personal");
  assert.match(copy.text, /판타지/);
  assert.ok(copy.text.length < 500);
});

test("pair and ranking sharing preserve their intended destinations", () => {
  const pair = pairShareCopy({
    ownerNickname: "주인", challengerNickname: "도전자", score: 88, bandLabel: "취향 잘 맞음",
    sharedGenres: ["판타지"], differentGenres: ["로맨스"], trustSentence: "추천을 믿을 만해.",
    pairUrl: "https://example.com/match/c/code/match/result",
  });
  const ranking = rankingShareCopy({
    topEntry: { nickname: "도전자", score: 88 }, challengeUrl: "https://example.com/match/c/code",
  });
  assert.equal(new URL(pair.shareUrl).pathname, "/match/c/code/match/result");
  assert.equal(new URL(ranking.shareUrl).pathname, "/match/c/code");
  assert.equal(new URL(pair.shareUrl).searchParams.get("utm_content"), "pair");
  assert.equal(new URL(ranking.shareUrl).searchParams.get("utm_content"), "ranking_initial");
  assert.ok(pair.text.length < 500);
  assert.ok(ranking.text.length < 500);
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
  assert.deepEqual(queue.at(-1).properties, { shareType: "personal", action: "link", index: 204 });
});
