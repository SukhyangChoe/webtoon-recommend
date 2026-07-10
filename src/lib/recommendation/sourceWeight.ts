export type SourceDb = "precision" | "coverage";

export function normalizeSourceDb(value: unknown): SourceDb {
  if (value === "coverage") return "coverage";
  return "precision";
}

export function getSourceWeight(sourceDb?: SourceDb) {
  if (sourceDb === "coverage") return 0.4;
  return 1.0;
}