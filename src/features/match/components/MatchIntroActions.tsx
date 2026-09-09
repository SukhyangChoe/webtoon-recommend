"use client";

import { MATCH_ROUTES } from "../config/routes";
import { createEmptyMatchDraft, readMatchDraft, writeMatchDraft } from "../storage/draft.mjs";

export function MatchIntroActions() {
  function begin() {
    const draft = readMatchDraft(window.localStorage) ?? createEmptyMatchDraft();
    const nextPath = MATCH_ROUTES.genreShelf(1);
    writeMatchDraft(window.localStorage, { ...draft, currentPath: nextPath });
    window.location.assign(nextPath);
  }

  return <button className="match-button" type="button" onClick={begin}>알겠어, 시작할게</button>;
}
