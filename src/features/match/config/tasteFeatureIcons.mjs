// Original 32px illustrations for the exact public taste labels, not category symbols.
// Motifs: returning time, transferred identity, training, hidden strength, and so on.
export const TASTE_FEATURE_ICONS = Object.freeze({
  '회귀': { key: 'returning_time', path: 'M7 9a11 11 0 1 1-2 12M7 3v6H1M16 9v8l5 3M12 27h7' },
  '빙의': { key: 'transferred_identity', path: 'M7 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM2 24v-4a5 5 0 0 1 10 0v4M25 19a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM20 31v-1a5 5 0 0 1 10 0v1M14 7h10l-3-3m3 3-3 3M18 24h-5l3-3m-3 3 3 3' },
  '시스템': { key: 'system_window', path: 'M5 4h22v24H5ZM5 10h22M9 7h1m3 0h1M10 15l3 3-3 3m7-3h5M10 24h12' },
  '학원': { key: 'academy', path: 'm3 12 13-8 13 8-13 8-13-8ZM8 15v8q8 6 16 0v-8M29 12v12M27 27l2-3 2 3M13 7h6' },
  '궁정·가문': { key: 'family_crest', path: 'm7 10-3-6 7 3 5-5 5 5 7-3-3 6H7ZM7 14h18v7q-2 7-9 10-7-3-9-10v-7ZM16 17v9m-4-6h8' },
  '추리': { key: 'case_clues', path: 'M4 4h15v19H4ZM8 8h7M8 12h4M25 19a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6M17 16h2v3h-2m1 3h.01' },
  '오컬트': { key: 'occult_candle', path: 'M13 17h6v11h-6ZM16 3c-6 6-5 9 0 10 5-1 6-4 0-10ZM9 29h14M4 9v4m-2-2h4M26 17v4m-2-2h4M23 5l2-2 2 2-2 2-2-2Z' },
  '생존': { key: 'survival_camp', path: 'M2 26 14 6l12 20H2ZM8 26l6-11 6 11M23 3l-2 9 5-2-1 7 6-13-5 2 1-3M5 30h21' },
  '현실·직업': { key: 'working_day', path: 'M4 10h24v18H4ZM11 10V5h10v5M4 17q12 8 24 0M13 18h6v5h-6ZM8 28v2m16-2v2' },
  '연예계': { key: 'stage_microphone', path: 'M12 5a4 4 0 0 1 8 0v10a4 4 0 0 1-8 0V5ZM8 13v2a8 8 0 0 0 16 0v-2M16 23v6m-6 0h12M12 8h8m-8 4h8M3 3l4 2-4 2m26-4-4 2 4 2' },
  '성장': { key: 'growth_steps', path: 'M3 28h8v-7h8v-7h10M8 19v-8M8 14C2 14 2 7 2 7s7 0 6 7ZM8 11C8 4 15 3 15 3s1 7-7 8ZM21 8l4-4 4 4m-4-4v10' },
  '액션': { key: 'impact_strike', path: 'm4 24 12-12 7 7-12 12-7-7ZM16 12V7l4-1 8 8-1 5h-4M2 15l5-1m-1-8 4 4M17 1l1 5m10-3-4 4M30 22l-4 1' },
  '사이다': { key: 'refreshing_payoff', path: 'M10 8h12l2 22H8l2-22ZM10 13h12M12 25l4-8h-3l5-7M12 3h7m-4-2v4M3 9l2-2m21-3 2-2M27 12h3' },
  '전략': { key: 'planned_moves', path: 'M11 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM8 13h6l2 10H6l2-10ZM4 27h14v3H4ZM21 27V14h7m-4-4 4 4-4 4M20 5h9' },
  '반전': { key: 'plot_turn', path: 'M5 5h15l7 7v15H5ZM20 5v8h7M9 10h6M10 19h12l-3-3m3 3-3 3M20 25H9l3 3m-3-3 3-3' },
  '긴장감': { key: 'ticking_tension', path: 'M16 6a11 11 0 1 1-11 11A11 11 0 0 1 16 6ZM12 2h8m-4 0v4M16 10v7l4 3M3 3l3 3m23-3-3 3M7 18h5l2-5 3 9 2-4h6' },
  '세계관': { key: 'story_world', path: 'M28 16a12 12 0 1 1-24 0 12 12 0 0 1 24 0ZM4 16h24M16 4c-8 6-8 18 0 24 8-6 8-18 0-24ZM7 8l6 3-2 5m14 6-6-2-2 4' },
  '운영': { key: 'building_organization', path: 'M3 14h26l-3-8H6l-3 8ZM5 14v15h22V14M3 14q3 6 6 0 4 6 7 0 4 6 7 0 3 6 6 0M9 29V19h6v10M20 20h3v4h-3Z' },
  '코미디': { key: 'laughing_dialogue', path: 'M4 4h24v19H14l-7 6v-6H4V4ZM9 11q2-4 4 0m6 0q2-4 4 0M10 15h12q-6 12-12 0Z' },
  '감정선': { key: 'emotional_arc', path: 'M3 24c4 5 7-10 11-5s8-1 15-6M16 17 6 8C-1 0 9-2 16 5c7-7 17-5 10 3l-10 9Z' },
  '힘숨찐': { key: 'concealed_power', path: 'M5 16C6 0 26 0 27 16L16 11 5 16ZM8 16v8l8 6 8-6v-8M11 20h2m6 0h2M17 12l-4 8h5l-3 8 8-12h-6l3-4' },
  '노력형': { key: 'training_day', path: 'M2 14h28M3 9h4v10H3ZM25 9h4v10h-4ZM8 6h4v16H8ZM20 6h4v16h-4ZM13 28l3-4 3 4m-3-4v7M14 3h4' },
  '먼치킨': { key: 'overwhelming_hero', path: 'M16 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM10 14h12l-1 16h-4l-1-8-1 8h-4l-1-16ZM10 13 3 28l8-3m11-12 7 15-8-3M16 13l-3 5h6l-3 4' },
  '동료·가족': { key: 'trusted_companions', path: 'M16 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM6 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm20 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM9 26v-7a7 7 0 0 1 14 0v7M2 26v-6a4 4 0 0 1 7-2m21 8v-6a4 4 0 0 0-7-2M5 30h22' },
  '직진 케미': { key: 'direct_chemistry', path: 'M2 10c-3-5 3-8 6-4 3-4 9-1 6 4l-6 6-6-6Zm16 12c-3-5 3-8 6-4 3-4 9-1 6 4l-6 6-6-6ZM6 27 25 6m-6 0h6v6' },
  '쌓이는 관계': { key: 'growing_bond', path: 'M3 27h26v4H3ZM7 22h18v5H7ZM11 17h10v5H11ZM16 14l-7-6c-4-5 2-9 7-4 5-5 11-1 7 4l-7 6Z' },
  '상처·치유': { key: 'healing_heart', path: 'M16 28 4 16C-4 6 8-1 16 8c8-9 20-2 12 8L16 28ZM10 11l11 11m-6-14 11 11M13 14l3-3m-1 5 3-3m-1 5 3-3' },
  '후회·집착': { key: 'lingering_attachment', path: 'M16 22 8 14C2 7 9 2 16 8c7-6 14-1 8 6l-8 8ZM4 17a13 13 0 0 0 24 6M28 30v-7h-7M27 3c-4 4-4 6 0 7 4-1 4-3 0-7Z' },
  '주도권 역전': { key: 'reversed_control', path: 'M8 11a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM5 19h6l2 10H3l2-10ZM21 18h6l2 11H19l2-11ZM21 15l-2-7 5 3 5-3-2 7h-6ZM5 6h11l-3-3m3 3-3 3M27 31H16l3-3m-3 3 3 0' },
  '정의로운 반격': { key: 'righteous_counterattack', path: 'M16 2 4 7v9q1 9 12 14 11-5 12-14V7L16 2ZM9 17l5 5 10-12M8 5l3 5m13-5-3 5' },
});

const CATEGORY_ICONS = {
  설정: { key: 'story_setting', path: 'M3 6q7-3 13 1 6-4 13-1v23q-7-3-13 0-6-3-13 0V6ZM16 7v22M7 12h5m-5 5h5m8-5h5m-5 5h5' },
  전개: { key: 'story_progression', path: 'M5 5h22v22H5ZM10 21v-6h6v-5h7m-4-4 4 4-4 4M9 10h2' },
  관계: { key: 'character_relationship', path: 'M9 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm14 0a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM2 27v-6a7 7 0 0 1 14 0v6m0-6a7 7 0 0 1 14 0v6M10 23h12m-3-3 3 3-3 3' },
};

export function tasteFeatureIconFor(value, category) {
  return Object.hasOwn(TASTE_FEATURE_ICONS, value) ? TASTE_FEATURE_ICONS[value] : CATEGORY_ICONS[category] ?? CATEGORY_ICONS.설정;
}

/** Keep Korean words intact and attach a one-character word to its preceding phrase. */
export function resultTitlePhrases(title) {
  return title.trim().split(/\s+/).reduce((phrases, word) => {
    if (Array.from(word).length === 1 && phrases.length) phrases[phrases.length - 1] += ` ${word}`;
    else phrases.push(word);
    return phrases;
  }, []);
}
