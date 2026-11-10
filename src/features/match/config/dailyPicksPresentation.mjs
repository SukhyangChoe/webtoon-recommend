// Public task names only. These are emitted by the running server workflow,
// never guessed from elapsed time or used to claim a completion percentage.
export const DAILY_PROGRESS_MESSAGES = Object.freeze({
  loading: '취향작을 불러오고 있어요…',
  checking: '최신 취향을 확인하고 있어요…',
  narrowing: '추천 범위를 좁히고 있어요…',
  selecting: '내 취향에 맞는 작품을 고르고 있어요…',
  saving: '오늘의 취향작을 저장하고 있어요…',
  readying: '선정한 작품을 불러오고 있어요…',
  waiting: '취향작을 고르고 있어요. 잠시만 기다려 주세요…',
});
export const DAILY_LOADING_MESSAGES = Object.freeze(Object.values(DAILY_PROGRESS_MESSAGES));

// Cache verification / hydration are reads. Only these server signals prove that
// this selection needs computing (or another worker is already computing it).
export function isDailyRecalculationStage(stage) {
  return ['narrowing','selecting','saving','waiting'].includes(stage);
}
