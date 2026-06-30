import {
    calculateGenrePreferenceResult,
    type GenrePreferenceResult,
    type PairChoiceAnswer,
  } from "./calculateGenrePreferenceResult";
  import type { GenrePreferenceQuestion } from "@/data/tests/genrePreference";
  
  export type GenreMapResult = GenrePreferenceResult;
  
  export function getGenreMapResult(params: {
    answers: PairChoiceAnswer[];
    questions?: GenrePreferenceQuestion[];
  }): GenreMapResult {
    return calculateGenrePreferenceResult({
      answers: params.answers,
      questions: params.questions,
    });
  }