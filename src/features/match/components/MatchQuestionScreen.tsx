"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { matchGenreMap, matchQuestionSeed, getFeature, getMatchQuestion } from "../data/questionSeed";
import { MATCH_ROUTES } from "../config/routes";
import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { createEmptyMatchDraft, readMatchDraft, writeMatchDraft } from "../storage/draft.mjs";
import type { DuelChoice, GenreChoice, MatchAnswers } from "../storage/draftTypes";
import { getSettingWeights, needsGenreRecovery, normalizeSettingSelection, shouldSwapDuel, toggleDuelSide, toggleExclusiveSelection, toggleRankedSelection, validateSettingSelection } from "../engine/selectionPolicy.mjs";

type Screen =
  | { type: "genre"; page: 1 | 2 }
  | { type: "duel"; index: number }
  | { type: "setting" }
  | { type: "ranked"; kind: "appeal" | "characterRelationship" }
  | { type: "avoidance" }
  | { type: "recovery" };

const screenMeta = {
  setting: { questionId: "wm_positive_01_setting", next: MATCH_ROUTES.appeal, previous: MATCH_ROUTES.duel(6) },
  appeal: { questionId: "wm_positive_02_appeal", next: MATCH_ROUTES.characterRelationship, previous: MATCH_ROUTES.setting },
  characterRelationship: { questionId: "wm_positive_03_character_relationship", next: MATCH_ROUTES.avoidance, previous: MATCH_ROUTES.appeal },
} as const;

function currentPath(screen: Screen) {
  if (screen.type === "genre") return MATCH_ROUTES.genreShelf(screen.page);
  if (screen.type === "duel") return MATCH_ROUTES.duel(screen.index);
  if (screen.type === "setting") return MATCH_ROUTES.setting;
  if (screen.type === "ranked") return screenMeta[screen.kind].next === MATCH_ROUTES.characterRelationship ? MATCH_ROUTES.appeal : MATCH_ROUTES.characterRelationship;
  if (screen.type === "avoidance") return MATCH_ROUTES.avoidance;
  return "/match/test/recovery";
}

export function MatchQuestionScreen({ screen }: { screen: Screen }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<MatchAnswers>({});
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const path = currentPath(screen);

  useEffect(() => {
    const draft = readMatchDraft(window.localStorage) ?? createEmptyMatchDraft();
    writeMatchDraft(window.localStorage, { ...draft, currentPath: path });
    const timer = window.setTimeout(() => {
      setAnswers((draft.answers ?? {}) as MatchAnswers);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [path]);

  function update(nextAnswers: MatchAnswers) {
    setAnswers(nextAnswers);
    const draft = readMatchDraft(window.localStorage) ?? createEmptyMatchDraft();
    writeMatchDraft(window.localStorage, { ...draft, currentPath: path, answers: nextAnswers });
  }

  if (!ready) return <QuestionShell progress="불러오는 중" title="응답을 복구하고 있어요" question="잠시만 기다려 주세요." />;

  if (screen.type === "genre") {
    const question = getMatchQuestion(`wm_genre_shelf_0${screen.page}`);
    const genreAnswers = answers.genre ?? {};
    const complete = question.genreKeys?.every((key) => genreAnswers[key]) ?? false;
    const previous = screen.page === 1 ? MATCH_ROUTES.intro : MATCH_ROUTES.genreShelf(1);
    const next = screen.page === 1 ? MATCH_ROUTES.genreShelf(2) : MATCH_ROUTES.duel(1);
    const choices = matchQuestionSeed.choiceSets.genre_affinity_three_level as Array<{ choiceKey: GenreChoice; displayLabel: string }>;
    return (
      <QuestionShell {...question}>
        <div className="match-genre-list">
          {question.genreKeys?.map((genreKey) => {
            const genre = matchGenreMap[genreKey];
            return <article className="match-genre-card" key={genreKey}>
              <div className="match-genre-card__visual" aria-hidden="true">{genre.displayLabel.slice(0, 1)}</div>
              <div><h2>{genre.displayLabel}</h2><p>{genre.shortScope}</p></div>
              <div className="match-segmented" aria-label={`${genre.displayLabel} 선택`}>
                {choices.map((choice) => <button key={choice.choiceKey} type="button" className={genreAnswers[genreKey] === choice.choiceKey ? "is-selected" : ""} onClick={() => update({ ...answers, genre: { ...genreAnswers, [genreKey]: choice.choiceKey } })}>{choice.displayLabel}</button>)}
              </div>
            </article>;
          })}
        </div>
        <Navigation previous={previous} disabled={!complete} onNext={() => router.push(next)} />
      </QuestionShell>
    );
  }

  if (screen.type === "duel") {
    const question = getMatchQuestion(`wm_duel_0${screen.index}_${["fantasy_vs_murim", "romance_vs_ropan", "action_vs_sports", "drama_vs_comedy", "thriller_vs_action", "fantasy_vs_ropan"][screen.index - 1]}`);
    const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
    const swapped = shouldSwapDuel(identity.anonymousId, question.questionId);
    const left = swapped ? question.right! : question.left!;
    const right = swapped ? question.left! : question.right!;
    const selected = answers.duels?.[question.questionId]?.choiceKey;
    const choiceMap = Object.fromEntries(
      (matchQuestionSeed.choiceSets.duel_four_way as Array<{ choiceKey: DuelChoice; displayLabel: string }>).map((choice) => [choice.choiceKey, choice])
    ) as Record<DuelChoice, { choiceKey: DuelChoice; displayLabel: string }>;
    const choices = [choiceMap.left, choiceMap.right, choiceMap.both, choiceMap.neither];
    const previous = screen.index === 1 ? MATCH_ROUTES.genreShelf(2) : MATCH_ROUTES.duel(screen.index - 1);
    const next = screen.index === 6 ? MATCH_ROUTES.setting : MATCH_ROUTES.duel(screen.index + 1);
    function selectChoice(choiceKey: DuelChoice) {
      update({ ...answers, duels: { ...answers.duels, [question.questionId]: { choiceKey, swapped } } });
    }
    return <QuestionShell {...question}>
      <div className="match-duel-grid">
        {[left, right].map((card, index) => {
          const side = index === 0 ? "left" : "right";
          const active = selected === side || selected === "both";
          return <button type="button" className={`match-duel-card ${active ? "is-selected" : ""}`} aria-pressed={active} aria-label={`${index === 0 ? "왼쪽" : "오른쪽"} 이미지 선택: ${card.cardLabel}`} key={card.imageKey} onClick={() => selectChoice(toggleDuelSide(selected, side) as DuelChoice)}><div className={`match-duel-placeholder match-duel-placeholder--${card.genreKey}`}><span>{matchGenreMap[card.genreKey].displayLabel}</span></div><h2>{card.cardLabel}</h2><span className="sr-only">{card.altText}</span><span className="match-duel-side">{index === 0 ? "왼쪽" : "오른쪽"}</span><span className="match-duel-check" aria-hidden="true">✓</span></button>;
        })}
      </div>
      <div className="match-choice-grid">{choices.map((choice) => <button type="button" className={`match-choice-button ${selected === choice.choiceKey ? "is-selected" : ""}`} key={choice.choiceKey} onClick={() => selectChoice(choice.choiceKey)}>{choice.displayLabel}</button>)}</div>
      <Navigation previous={previous} disabled={!selected} onNext={() => router.push(next)} />
    </QuestionShell>;
  }

  if (screen.type === "setting") {
    const meta = screenMeta.setting;
    const question = getMatchQuestion(meta.questionId);
    const setting = normalizeSettingSelection(answers.setting ?? { selected: [], primary: null, indifferent: false });
    const validation = validateSettingSelection(setting);
    const valid = validation === "PASS" || validation.startsWith("PASS_");
    function select(key: string) {
      setNotice("");
      if (!setting.selected.includes(key) && setting.selected.length >= 4) { setNotice("설정은 최대 4개까지 고를 수 있어요."); return; }
      const selected = setting.selected.includes(key) ? setting.selected.filter((item: string) => item !== key) : [...setting.selected, key];
      const normalized = normalizeSettingSelection({ selected, primary: setting.primary, indifferent: false });
      update({ ...answers, setting: { ...normalized, weights: getSettingWeights(normalized) } });
    }
    return <QuestionShell {...question}>
      <div className="match-feature-grid">{question.optionFeatureKeys?.map((key) => { const feature = getFeature(key); const selected = setting.selected.includes(key); return <div className={`match-feature-card ${selected ? "is-selected" : ""}`} key={key}><button type="button" onClick={() => select(key)}><strong>{feature.displayLabel}</strong><span>{selected ? "✓ 선택됨" : feature.description}</span></button>{selected ? <button className={`match-primary-toggle ${setting.primary === key ? "is-primary" : ""}`} type="button" aria-label={`${feature.displayLabel} 대표 설정`} onClick={() => update({ ...answers, setting: { ...setting, primary: key, weights: getSettingWeights({ ...setting, primary: key }) } })}>★ 대표</button> : null}</div>; })}</div>
      <button type="button" className={`match-exclusive-button ${setting.indifferent ? "is-selected" : ""}`} onClick={() => update({ ...answers, setting: { selected: [], primary: null, indifferent: !setting.indifferent, weights: {} } })}>설정은 크게 안 따짐</button>
      {notice ? <p className="match-notice" role="alert">{notice}</p> : null}
      {setting.selected.length >= 2 && !setting.primary ? <p className="match-notice">선택한 설정 중 대표 하나에 ★를 표시해 주세요.</p> : null}
      <Navigation previous={meta.previous} disabled={!valid} onNext={() => router.push(meta.next)} />
    </QuestionShell>;
  }

  if (screen.type === "ranked") {
    const meta = screenMeta[screen.kind];
    const question = getMatchQuestion(meta.questionId);
    const selected = answers[screen.kind] ?? [];
    return <QuestionShell {...question}>
      <div className="match-feature-grid">{question.optionFeatureKeys?.map((key) => { const feature = getFeature(key); const rank = selected.indexOf(key) + 1; return <button type="button" key={key} className={`match-ranked-card ${rank ? "is-selected" : ""}`} onClick={() => update({ ...answers, [screen.kind]: toggleRankedSelection(selected, key, 2) })}><span className="match-rank-badge">{rank || ""}</span><strong>{feature.displayLabel}</strong><small>{feature.description}</small></button>; })}</div>
      <Navigation previous={meta.previous} disabled={selected.length < 1} onNext={() => router.push(meta.next)} />
    </QuestionShell>;
  }

  if (screen.type === "avoidance") {
    const question = getMatchQuestion("wm_avoidance_01");
    const selected = answers.avoidance ?? [];
    return <QuestionShell {...question}>
      <div className="match-feature-grid">{question.optionFeatureKeys?.map((key) => { const feature = getFeature(key); const rank = selected.indexOf(key) + 1; return <button type="button" key={key} className={`match-ranked-card ${rank ? "is-selected" : ""}`} onClick={() => { const next = toggleExclusiveSelection(selected, key, "avoid_none", 3); if (next.length === selected.length && !selected.includes(key)) setNotice("최대 3개까지 고를 수 있어요."); else setNotice(""); update({ ...answers, avoidance: next }); }}><span className="match-check-badge">{rank ? "✓" : ""}</span><strong>{feature.displayLabel}</strong></button>; })}</div>
      {notice ? <p className="match-notice" role="alert">{notice}</p> : null}
      <Navigation previous={MATCH_ROUTES.characterRelationship} disabled={selected.length < 1} label="결과 만들기" onNext={() => router.push(needsGenreRecovery({ genreAnswers: answers.genre, duelAnswers: answers.duels }) ? "/match/test/recovery" : MATCH_ROUTES.building)} />
    </QuestionShell>;
  }

  const question = getMatchQuestion("wm_genre_recovery_01");
  return <QuestionShell {...question}>
    <div className="match-feature-grid">{question.genreKeys?.map((key) => <button type="button" key={key} className={`match-ranked-card ${answers.recoveryGenre === key ? "is-selected" : ""}`} onClick={() => update({ ...answers, recoveryGenre: key })}><span className="match-check-badge">{answers.recoveryGenre === key ? "✓" : ""}</span><strong>{matchGenreMap[key].displayLabel}</strong><small>{matchGenreMap[key].shortScope}</small></button>)}</div>
    <Navigation previous={MATCH_ROUTES.avoidance} disabled={!answers.recoveryGenre} label="결과 만들기" onNext={() => router.push(MATCH_ROUTES.building)} />
  </QuestionShell>;
}

function QuestionShell({ progressLabel, progress, title, questionText, question, helperText, children }: { progressLabel?: string; progress?: string; title: string; questionText?: string; question?: string; helperText?: string; children?: React.ReactNode }) {
  return <main className="match-page match-question-page"><section className="match-card"><p className="match-eyebrow">{progressLabel ?? progress}</p><h1>{title}</h1><p className="match-question-text">{questionText ?? question}</p>{helperText ? <p className="match-helper">{helperText}</p> : null}{children}</section></main>;
}

function Navigation({ previous, disabled, onNext, label = "다음" }: { previous: string; disabled: boolean; onNext: () => void; label?: string }) {
  return <div className="match-navigation"><button type="button" className="match-back-button" onClick={() => history.back()} aria-label="이전 화면">←</button><button type="button" className="match-button" disabled={disabled} onClick={onNext}>{label}</button><a className="sr-only" href={previous}>이전</a></div>;
}
