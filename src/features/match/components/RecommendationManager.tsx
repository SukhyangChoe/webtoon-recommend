"use client";

import { useEffect, useState } from "react";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";

type Webtoon = {
  canonicalWebtoonId: string;
  title: string;
  platform: string;
  officialUrl: string | null;
  mainGenre: string;
};

export function RecommendationManager({ publicProfileId }: { publicProfileId: string }) {
  const [selected, setSelected] = useState<Webtoon[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/results/${publicProfileId}/recommendations`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error();
        if (active) setSelected(Array.isArray(body.items) ? body.items : []);
      })
      .catch(() => active && setMessage("추천작을 불러오지 못했어요."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [publicProfileId]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearched(false);
    setMessage("");
    setSaved(false);
    try {
      const response = await fetch(`/api/v1/webtoons/search?q=${encodeURIComponent(query.trim())}`);
      const body = await response.json();
      if (!response.ok) throw new Error();
      setResults(Array.isArray(body.items) ? body.items : []);
      setSearched(true);
    } catch {
      setMessage("작품을 검색하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSearching(false);
    }
  }

  function add(item: Webtoon) {
    setSaved(false);
    setMessage("");
    if (selected.some((selectedItem) => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId)) {
      setMessage("이미 추천 목록에 있는 작품이에요.");
      return;
    }
    if (selected.length >= 10) {
      setMessage("추천작은 최대 10개까지 등록할 수 있어요.");
      return;
    }
    setSelected((items) => [...items, item]);
  }

  function remove(canonicalWebtoonId: string) {
    setSaved(false);
    setSelected((items) => items.filter((item) => item.canonicalWebtoonId !== canonicalWebtoonId));
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= selected.length) return;
    setSaved(false);
    setSelected((items) => {
      const next = [...items];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    setSaved(false);
    try {
      const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
      const response = await fetch(`/api/v1/results/${publicProfileId}/recommendations`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anonymousId: identity.anonymousId, canonicalWebtoonIds: selected.map((item) => item.canonicalWebtoonId) }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.error === "WEBTOON_NOT_AVAILABLE") throw new Error("현재 등록할 수 없는 작품이 포함되어 있어요.");
        if (body.error === "RESULT_OWNER_MISMATCH") throw new Error("이 추천 목록을 수정할 권한이 없어요.");
        throw new Error("추천작을 저장하지 못했어요.");
      }
      setSelected(body.items);
      setSaved(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "추천작을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="match-card match-hero"><p>추천작을 불러오는 중이에요…</p></section>;

  return <main className="match-page match-recommendation-manager"><header><p className="match-eyebrow">내 추천작</p><h1>친구에게 권할 작품을 골라 주세요</h1><p>작품 DB에 등록된 웹툰 중 최대 10개까지 선택할 수 있어요.</p></header><section className="match-result-section"><div className="match-section-heading"><h2>선택한 작품</h2><strong>{selected.length}/10</strong></div>{selected.length ? <ol className="match-selected-webtoons">{selected.map((item, index) => <li key={item.canonicalWebtoonId}><span>{index + 1}</span><div><strong>{item.title}</strong><small>{item.platform}</small></div><div><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`${item.title} 위로`}>↑</button><button type="button" disabled={index === selected.length - 1} onClick={() => move(index, 1)} aria-label={`${item.title} 아래로`}>↓</button><button type="button" onClick={() => remove(item.canonicalWebtoonId)}>삭제</button></div></li>)}</ol> : <p className="match-empty-label">검색해서 추천작을 추가해 주세요.</p>}</section><section className="match-result-section"><h2>작품 검색</h2><form className="match-webtoon-search" onSubmit={search}><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} placeholder="작품명을 입력해 주세요" aria-label="추천할 웹툰 검색" /><button className="match-button" type="submit" disabled={searching || !query.trim()}>{searching ? "검색 중…" : "검색"}</button></form>{results.length ? <ul className="match-webtoon-search-results">{results.map((item) => { const added = selected.some((selectedItem) => selectedItem.canonicalWebtoonId === item.canonicalWebtoonId); return <li key={item.canonicalWebtoonId}><div><strong>{item.title}</strong><span>{item.platform} · {item.mainGenre}</span></div><button type="button" disabled={added || selected.length >= 10} onClick={() => add(item)}>{added ? "추가됨" : "추가"}</button></li>; })}</ul> : searched && !searching ? <p className="match-empty-label">검색 결과가 없어요.</p> : null}</section>{message ? <p className="match-notice is-error" role="alert">{message}</p> : null}{saved ? <p className="match-save-success" role="status">추천작을 저장했어요.</p> : null}<div className="match-result-actions"><button className="match-button" type="button" disabled={saving} onClick={() => void save()}>{saving ? "저장 중…" : "추천작 저장"}</button><a className="match-button match-button--secondary" href={`/match/result/${publicProfileId}`}>내 결과로 돌아가기</a></div></main>;
}
