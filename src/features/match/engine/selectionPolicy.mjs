export function stableHash(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shouldSwapDuel(anonymousId, questionId) {
  return stableHash(`${anonymousId}:${questionId}`) % 2 === 1;
}

export function toggleDuelSide(choiceKey, side) {
  let leftSelected = choiceKey === "left" || choiceKey === "both";
  let rightSelected = choiceKey === "right" || choiceKey === "both";
  if (side === "left") leftSelected = !leftSelected;
  if (side === "right") rightSelected = !rightSelected;
  if (leftSelected && rightSelected) return "both";
  if (leftSelected) return "left";
  if (rightSelected) return "right";
  return "neither";
}

export function normalizeSettingSelection(input) {
  const selected = [...new Set(input.selected ?? [])];
  if (input.indifferent) {
    return { selected: [], primary: null, indifferent: true };
  }

  const limited = selected.slice(0, 4);
  let primary = limited.includes(input.primary) ? input.primary : null;
  if (limited.length === 1) primary = limited[0];
  return { selected: limited, primary, indifferent: false };
}

export function validateSettingSelection(input) {
  const selected = [...new Set(input.selected ?? [])];
  if (input.indifferent && selected.length > 0) return "FAIL_EXCLUSIVE_CHOICE";
  if (input.indifferent) return "PASS_EVIDENCE_INDIFFERENT";
  if (selected.length > 4) return "FAIL_MAX_SELECT_4";
  if (selected.length === 0) return "FAIL_MIN_SELECT_1";
  if (input.primary && !selected.includes(input.primary)) return "FAIL_PRIMARY_NOT_SELECTED";
  if (selected.length === 1 && !input.primary) return "PASS_AUTO_ASSIGN_PRIMARY";
  if (selected.length >= 2 && !input.primary) return "FAIL_PRIMARY_REQUIRED";
  return "PASS";
}

export function getSettingWeights(input) {
  const state = normalizeSettingSelection(input);
  if (state.indifferent || !state.primary || state.selected.length === 0) return {};
  const denominator = state.selected.length + 1;
  return Object.fromEntries(
    state.selected.map((key) => [key, Number(((key === state.primary ? 2 : 1) / denominator).toFixed(6))])
  );
}

export function promotePrimarySelection(selected, key, max = 4) {
  const limited = [...new Set(selected ?? [])].slice(0, max);
  if (!limited.includes(key)) return limited;
  return [key, ...limited.filter((item) => item !== key)];
}

export function getPrimarySelectionWeights(selected, max = 4) {
  const limited = [...new Set(selected ?? [])].slice(0, max);
  if (limited.length === 0) return {};
  const denominator = limited.length + 1;
  return Object.fromEntries(
    limited.map((key, index) => [key, Number(((index === 0 ? 2 : 1) / denominator).toFixed(6))])
  );
}

export function togglePrimarySelection(selected, key, max = 4) {
  const limited = [...new Set(selected ?? [])].slice(0, max);
  if (limited.includes(key)) return limited.filter((item) => item !== key);
  if (limited.length >= max) return limited;
  return [...limited, key];
}

export function toggleExclusiveSelection(selected, key, exclusiveKey, max) {
  if (key === exclusiveKey) return selected.includes(key) ? [] : [key];
  const withoutExclusive = selected.filter((item) => item !== exclusiveKey);
  if (withoutExclusive.includes(key)) return withoutExclusive.filter((item) => item !== key);
  if (withoutExclusive.length >= max) return withoutExclusive;
  return [...withoutExclusive, key];
}

export function needsGenreRecovery({ genreAnswers = {}, duelAnswers = {} }) {
  const hasBaseScore = Object.values(genreAnswers).some((choice) => choice === "high" || choice === "medium");
  const hasDuelScore = Object.values(duelAnswers).some((answer) => answer?.choiceKey && answer.choiceKey !== "neither");
  return !hasBaseScore && !hasDuelScore;
}
