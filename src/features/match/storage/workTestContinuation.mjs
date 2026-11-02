import { createEmptyMatchDraft, getMatchHomeState, readMatchDraft, writeMatchDraft } from './draft.mjs';
import { clearPendingChallenge, clearPairResultPrompt } from './challengeStorage.mjs';
import { safeWorkReturnPath, workDetailHref } from '../config/workDetailPresentation.mjs';
import { clearWorkReturn } from './workReturnStorage.mjs';

export const WORK_TEST_CONTINUATION_KEY = 'webtoon-match:work-test-continuation:v1';
const MAX_AGE = 24 * 60 * 60 * 1000;

/** Resume unfinished answers; starting a work test never deletes saved recommendations. */
export function beginWorkTasteTest({ storage, session, workId, returnTo, now = Date.now() }) {
  if (typeof workId !== 'string' || !/^[\w-]{1,100}$/.test(workId)) throw new Error('작품 정보를 확인하지 못했어요.');
  const previous = readMatchDraft(storage);
  const draft = previous && !previous.resultPublicId ? previous : createEmptyMatchDraft(new Date(now).toISOString());
  session.setItem(WORK_TEST_CONTINUATION_KEY, JSON.stringify({ workId, returnTo: safeWorkReturnPath(returnTo), startedAt: draft.startedAt, savedAt: now }));
  // After the test, browser history points at a question, not the original search page.
  session.removeItem('wm-work-entry');
  clearWorkReturn(session);
  writeMatchDraft(storage, draft);
  // An explicit work-test entry is not consent to join an old invitation.
  clearPendingChallenge(storage);
  clearPairResultPrompt(storage);
  const state = getMatchHomeState(draft);
  const resumable = state.status === 'in_progress' && (/^\/match\/test\/(genre-shelf\/[12]|duel\/[1-6]|taste\/(setting|appeal|character-relationship)|avoidance|recovery)$/.test(state.resumePath) || state.resumePath === '/match/result/building');
  return resumable ? state.resumePath : '/match/test/intro';
}

export function readWorkTestDestination(session, draft, now = Date.now()) {
  try {
    const saved = JSON.parse(session?.getItem(WORK_TEST_CONTINUATION_KEY) ?? 'null');
    if (!saved || !draft || saved.startedAt !== draft.startedAt || !Number.isFinite(saved.savedAt) || now < saved.savedAt || now - saved.savedAt > MAX_AGE || typeof saved.workId !== 'string' || !/^[\w-]{1,100}$/.test(saved.workId)) return null;
    return workDetailHref(saved.workId, safeWorkReturnPath(saved.returnTo));
  } catch { return null; }
}

export function clearWorkTestDestination(session) {
  try { session?.removeItem(WORK_TEST_CONTINUATION_KEY); } catch { /* Optional cleanup after a successful result. */ }
}
