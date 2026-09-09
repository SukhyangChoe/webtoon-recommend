import seedJson from "./questionSeed.v0.4.json";

export type GenreKey = "fantasy" | "murim" | "romance" | "ropan" | "action" | "thriller_horror" | "drama_daily" | "comedy" | "sports";

type CatalogItem = { featureKey: string; displayLabel: string; description?: string; publicShortLabel?: string | null };
type Genre = { genreKey: GenreKey; displayLabel: string; shortScope: string; imageKey: string; displayOrder: number };
type Choice = { choiceKey: string; displayLabel: string; score?: number; leftScore?: number; rightScore?: number };
type Question = {
  questionId: string; sectionKey: string; progressLabel: string; title: string; questionText: string;
  helperText?: string; genreKeys?: GenreKey[]; choiceSetKey?: string; optionFeatureKeys?: string[];
  left?: { genreKey: GenreKey; imageKey: string; cardLabel: string; altText: string };
  right?: { genreKey: GenreKey; imageKey: string; cardLabel: string; altText: string };
};

const seed = seedJson as unknown as {
  questionSetVersion: string;
  publicGenrePolicy: { publicGenres: Genre[] };
  choiceSets: Record<string, Choice[]>;
  positiveFeatureCatalog: CatalogItem[];
  avoidanceFeatureCatalog: CatalogItem[];
  specialChoiceCatalog: Record<string, { choiceKey: string; displayLabel: string; description: string }>;
  questions: Question[];
};

export const matchQuestionSeed = seed;
export const matchGenres = seed.publicGenrePolicy.publicGenres;
export const matchGenreMap = Object.fromEntries(matchGenres.map((genre) => [genre.genreKey, genre])) as Record<GenreKey, Genre>;

export function getMatchQuestion(questionId: string) {
  const question = seed.questions.find((item) => item.questionId === questionId);
  if (!question) throw new Error(`Unknown match question: ${questionId}`);
  return question;
}

export function getFeature(featureKey: string) {
  const feature = [...seed.positiveFeatureCatalog, ...seed.avoidanceFeatureCatalog].find((item) => item.featureKey === featureKey);
  if (!feature) throw new Error(`Unknown match feature: ${featureKey}`);
  return feature;
}
