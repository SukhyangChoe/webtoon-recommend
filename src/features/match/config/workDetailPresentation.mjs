import { safeWorkCoverUrl } from './recommendationPresentation.mjs';

export const WORK_ART_STYLES = {
  sharp_powerful: { label: '날카롭고 강한 인상', category: '인물 표현', icon: 'pen' },
  elegant_ornate: { label: '미형·우아한 장식성', category: '인물 표현', icon: 'pen' },
  realistic_natural: { label: '사실적·자연스러운 표현', category: '인물 표현', icon: 'pen' },
  rounded_cute: { label: '둥글고 귀여운 표현', category: '인물 표현', icon: 'pen' },
  detailed_rendering: { label: '섬세하고 밀도 있는 묘사', category: '묘사', icon: 'pen' },
  simple_graphic: { label: '간결한 그래픽 표현', category: '묘사', icon: 'pen' },
  rough_textured: { label: '거친 선·질감', category: '묘사', icon: 'pen' },
  bright_vivid: { label: '밝고 선명한 색감', category: '색감·분위기', icon: 'palette' },
  warm_soft: { label: '따뜻하고 부드러운 색감', category: '색감·분위기', icon: 'palette' },
  dark_moody: { label: '어둡고 묵직한 분위기', category: '색감·분위기', icon: 'palette' },
  action_dynamic: { label: '역동적인 액션 연출', category: '연출', icon: 'spark' },
  effect_showy: { label: '화려한 효과 연출', category: '연출', icon: 'spark' },
};

export const WORK_POINT_ICONS = {
  relationship_bond: 'bond', romance_chemistry: 'heart', emotional_depth: 'heart',
  light_healing: 'heart', real_life_empathy: 'heart', life_realism: 'heart',
  growth: 'growth', second_chance: 'growth', mystery_investigation: 'search',
  world_mystery: 'search', strategy_powerplay: 'search', action_catharsis: 'spark',
};

export function safeOfficialWorkUrl(value) {
  const safe = safeWorkCoverUrl(value);
  return safe?.startsWith('https://') ? safe : null;
}

export function safeWorkReturnPath(value) {
  if (typeof value !== 'string' || value.length > 1500 || /[\\\u0000-\u001f]/.test(value) || !/^\/match(?:[/?]|$)/.test(value)) return '/match';
  try {
    const url = new URL(value, 'https://webtoonfit.invalid');
    return url.origin === 'https://webtoonfit.invalid' ? url.pathname + url.search + url.hash : '/match';
  } catch { return '/match'; }
}

export function workDetailHref(id, profileId, returnTo) {
  const query = new URLSearchParams();
  if (typeof profileId === 'string' && /^[\w-]{1,100}$/.test(profileId)) query.set('profile', profileId);
  if (returnTo) query.set('returnTo', safeWorkReturnPath(returnTo));
  return `/match/work/${encodeURIComponent(id)}${query.size ? `?${query}` : ''}`;
}

export function rankedWorkLabels(scores, labels, icons = {}, limit = 3) {
  return Object.entries(scores ?? {})
    .filter(([key, score]) => typeof score === 'number' && Number.isFinite(score) && score > 0 && labels[key])
    .sort(([left, a], [right, b]) => b - a || left.localeCompare(right))
    .slice(0, limit)
    .map(([key]) => ({ key, label: labels[key], icon: icons[key] ?? 'spark' }));
}

export function workArtStyleCards(scores, limit = 3) {
  const used = new Set();
  return Object.entries(scores ?? {}).filter(([key, score]) => WORK_ART_STYLES[key] && typeof score === 'number' && score > 0)
    .sort(([left, a], [right, b]) => b - a || left.localeCompare(right))
    .flatMap(([key]) => {
      const entry = WORK_ART_STYLES[key];
      if (used.has(entry.category)) return [];
      used.add(entry.category);
      return [{ key, ...entry }];
    }).slice(0, limit).sort((left, right) => ['인물 표현','묘사','색감·분위기','연출'].indexOf(left.category) - ['인물 표현','묘사','색감·분위기','연출'].indexOf(right.category));
}

export function workStatusLabel(value) {
  return ({ ongoing: '연재 중', completed: '완결', hiatus: '휴재', season_break: '시즌 휴재' })[value] ?? null;
}

// Explain actual shared signals, not a generic work blurb masquerading as personalization.
export function sharedFitReasons(userVector, recommendation, tagLabels, contentLabels) {
  if (!userVector || !recommendation) return [];
  return [['tagScores', tagLabels], ['contentAxisScores', contentLabels], ['artStyleScores', Object.fromEntries(Object.entries(WORK_ART_STYLES).map(([key, value]) => [key, value.label]))]]
    .flatMap(([axis, labels]) => Object.entries(recommendation[axis] ?? {}).flatMap(([key, value]) => {
      const user = userVector[axis]?.[key];
      if (!(value > 0 && user > 0 && labels[key])) return [];
      return [{ key: `${axis}.${key}`, label: labels[key], icon: axis === 'artStyleScores' ? 'palette' : WORK_POINT_ICONS[key] ?? 'spark', strength: Math.min(value, user) }];
    }))
    .sort((a, b) => b.strength - a.strength || a.key.localeCompare(b.key))
    .slice(0, 2).map(({ key, label, icon }) => ({ key, label, icon }));
}
