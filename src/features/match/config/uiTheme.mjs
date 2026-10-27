// Shared by the live UI and downloaded share cards.
export const MATCH_UI_THEME = Object.freeze({
  accent: '#00C8EA', actionInk: '#073C47', accentInk: '#00697F',
  ink: '#193640', muted: '#647E87', paper: '#FFFEFA',
  soft: '#E3F8FC', border: '#DCEBEF', warm: '#FFF6D9', warmBorder: '#DFC16D',
});

export function matchScoreAngle(score) {
  return Math.max(0, Math.min(100, Number(score) || 0)) * 3.6;
}

export function matchQuestionProgress(screenOrder, total = 12) {
  const current = Math.max(0, Math.min(total, Number(screenOrder) || 0));
  return { current, total, percent: current / total * 100 };
}
