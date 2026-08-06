import type { PairChoiceAnswer } from "@/lib/testEngine/calculateGenrePreferenceResult";
import type { DetailTestAnswer, DetailTestKey } from "@/types/detailTest";

export type TestProgressSchemaVersion = "1.0";

export type GenrePreferenceProgress = {
  schemaVersion: TestProgressSchemaVersion;
  testKey: "genre_preference";
  testVersion: string;
  currentQuestionIndex: number;
  answers: PairChoiceAnswer[];
  startedAt: string;
  updatedAt: string;
};

export type DetailTestProgress = {
  schemaVersion: TestProgressSchemaVersion;
  testKey: DetailTestKey;
  testVersion: string;
  currentQuestionIndex: number;
  answers: Record<string, DetailTestAnswer>;
  selectedOptionKeys: string[];
  startedAt: string;
  updatedAt: string;
};