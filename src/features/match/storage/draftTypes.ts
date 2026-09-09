import type { GenreKey } from "../data/questionSeed";

export type GenreChoice = "high" | "medium" | "low";
export type DuelChoice = "left" | "both" | "right" | "neither";
export type MatchAnswers = {
  genre?: Partial<Record<GenreKey, GenreChoice>>;
  duels?: Record<string, { choiceKey: DuelChoice; swapped: boolean }>;
  setting?: { selected: string[]; primary: string | null; indifferent: boolean; weights?: Record<string, number> };
  appeal?: string[];
  characterRelationship?: string[];
  avoidance?: string[];
  recoveryGenre?: GenreKey;
};
