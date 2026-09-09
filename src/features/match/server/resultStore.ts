import { randomBytes, randomUUID } from "node:crypto";
import questionSeed from "../data/questionSeed.v0.4.json";
import { buildTasteSnapshot, toPublicTasteResult } from "../engine/resultEngine.mjs";
import type { MatchAnswers } from "../storage/draftTypes";

export type AccuracyFeedback = "almost_exact" | "mostly_right" | "slightly_off" | "very_off";
type StoredSnapshot = ReturnType<typeof buildTasteSnapshot> & { accuracyFeedback?: AccuracyFeedback };

const resultStore = new Map<string, StoredSnapshot>();

export function createTasteSnapshot(anonymousId: string, answers: MatchAnswers) {
  const publicProfileId = randomBytes(12).toString("base64url");
  const snapshot = buildTasteSnapshot({ seed: questionSeed, answers, anonymousId, profileId: randomUUID(), publicProfileId });
  resultStore.set(publicProfileId, snapshot);
  return snapshot;
}

export function getTasteSnapshot(publicProfileId: string) {
  return resultStore.get(publicProfileId) ?? null;
}

export function getPublicTasteResult(publicProfileId: string) {
  const snapshot = getTasteSnapshot(publicProfileId);
  return snapshot ? toPublicTasteResult(snapshot) : null;
}

export function saveAccuracyFeedback(publicProfileId: string, anonymousId: string, feedback: AccuracyFeedback) {
  const snapshot = getTasteSnapshot(publicProfileId);
  if (!snapshot || snapshot.anonymousId !== anonymousId) return false;
  snapshot.accuracyFeedback = feedback;
  return true;
}
