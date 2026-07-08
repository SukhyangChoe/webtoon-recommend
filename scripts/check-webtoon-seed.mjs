import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_SEED_PATH = path.join(
  process.cwd(),
  "src/data/webtoons/webtoons_seed_current.json"
);

const seedPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : DEFAULT_SEED_PATH;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmpty(value) {
  return value === undefined || value === null || value === "";
}

function isNonEmptyRecord(value) {
  return isRecord(value) && Object.keys(value).length > 0;
}

function hasNonEmptyNestedScoreMap(value) {
  if (!isRecord(value)) return false;

  return Object.values(value).some((nestedValue) => {
    return isNonEmptyRecord(nestedValue);
  });
}

function getMetadata(webtoon) {
  return isRecord(webtoon.metadata) ? webtoon.metadata : {};
}

function getRecommendation(webtoon) {
  return isRecord(webtoon.recommendation) ? webtoon.recommendation : {};
}

function countBy(items, predicate) {
  return items.filter(predicate).length;
}

function sampleTitles(items, predicate, limit = 20) {
  return items
    .filter(predicate)
    .slice(0, limit)
    .map((webtoon) => ({
      canonicalWebtoonId: webtoon.canonicalWebtoonId,
      title: webtoon.title,
      mainGenre: webtoon.mainGenre,
      platform: webtoon.platform,
    }));
}

function findDuplicateIds(webtoons) {
  const counts = new Map();

  webtoons.forEach((webtoon) => {
    const id = webtoon.canonicalWebtoonId ?? "__missing__";
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([canonicalWebtoonId, count]) => ({
      canonicalWebtoonId,
      count,
    }));
}

function countMainGenres(webtoons) {
  return webtoons.reduce((genreCounts, webtoon) => {
    const genreKey = webtoon.mainGenre ?? "__missing__";
    genreCounts[genreKey] = (genreCounts[genreKey] ?? 0) + 1;

    return genreCounts;
  }, {});
}

if (!fs.existsSync(seedPath)) {
  console.error(`Seed file not found: ${seedPath}`);
  process.exit(1);
}

const rawJson = fs.readFileSync(seedPath, "utf8");
const webtoons = JSON.parse(rawJson);

if (!Array.isArray(webtoons)) {
  console.error("Seed file must be a JSON array.");
  process.exit(1);
}

const duplicateCanonicalIds = findDuplicateIds(webtoons);

const checks = {
  total: webtoons.length,

  duplicateCanonicalIds: duplicateCanonicalIds.length,

  missingCanonicalWebtoonId: countBy(webtoons, (webtoon) =>
    isEmpty(webtoon.canonicalWebtoonId)
  ),
  missingTitle: countBy(webtoons, (webtoon) => isEmpty(webtoon.title)),
  missingPlatform: countBy(webtoons, (webtoon) => isEmpty(webtoon.platform)),
  missingOfficialUrl: countBy(webtoons, (webtoon) =>
    isEmpty(webtoon.officialUrl)
  ),
  missingMainGenre: countBy(webtoons, (webtoon) => isEmpty(webtoon.mainGenre)),

  missingMetadataStatus: countBy(webtoons, (webtoon) =>
    isEmpty(getMetadata(webtoon).status)
  ),
  missingMetadataUrlStatus: countBy(webtoons, (webtoon) =>
    isEmpty(getMetadata(webtoon).urlStatus)
  ),
  missingMetadataInputStatus: countBy(webtoons, (webtoon) =>
    isEmpty(getMetadata(webtoon).inputStatus)
  ),
  missingMetadataQualityScore: countBy(
    webtoons,
    (webtoon) => typeof getMetadata(webtoon).qualityScore !== "number"
  ),
  missingMetadataAgeRating: countBy(webtoons, (webtoon) =>
    isEmpty(getMetadata(webtoon).ageRating)
  ),
  missingMetadataIsAdult: countBy(
    webtoons,
    (webtoon) => typeof getMetadata(webtoon).isAdult !== "boolean"
  ),

  missingRecommendationReason: countBy(webtoons, (webtoon) =>
    isEmpty(getRecommendation(webtoon).recommendationReason)
  ),
  missingRecommendationScoreVersion: countBy(webtoons, (webtoon) =>
    isEmpty(getRecommendation(webtoon).scoreVersion)
  ),
  missingGenreScores: countBy(
    webtoons,
    (webtoon) => !isNonEmptyRecord(getRecommendation(webtoon).genreScores)
  ),
  missingTypeScores: countBy(
    webtoons,
    (webtoon) => !hasNonEmptyNestedScoreMap(getRecommendation(webtoon).typeScores)
  ),
  missingTagScores: countBy(
    webtoons,
    (webtoon) => !isNonEmptyRecord(getRecommendation(webtoon).tagScores)
  ),

  /**
   * avoidanceTagScores는 작품에 리스크 신호가 없으면 비어 있을 수 있다.
   * 이 값은 warning으로만 본다.
   */
  missingOrEmptyAvoidanceTagScores: countBy(
    webtoons,
    (webtoon) =>
      !isNonEmptyRecord(getRecommendation(webtoon).avoidanceTagScores)
  ),

  invalidUrlStatus: countBy(
    webtoons,
    (webtoon) => getMetadata(webtoon).urlStatus === "invalid"
  ),
  excludedInputStatus: countBy(webtoons, (webtoon) => {
    return (
      getMetadata(webtoon).inputStatus === "excluded" ||
      webtoon.inputStatus === "excluded"
    );
  }),

  mainGenreCounts: countMainGenres(webtoons),
};

const hardFailureKeys = [
  "duplicateCanonicalIds",
  "missingCanonicalWebtoonId",
  "missingTitle",
  "missingPlatform",
  "missingOfficialUrl",
  "missingMainGenre",
  "missingMetadataStatus",
  "missingMetadataUrlStatus",
  "missingMetadataInputStatus",
  "missingMetadataQualityScore",
  "missingRecommendationReason",
  "missingRecommendationScoreVersion",
  "missingGenreScores",
  "missingTypeScores",
  "missingTagScores",
];

const hardFailures = hardFailureKeys.filter((key) => {
  return checks[key] > 0;
});

console.log("\n=== Webtoon seed check ===");
console.log(`seedPath: ${seedPath}\n`);
console.log(JSON.stringify(checks, null, 2));

if (duplicateCanonicalIds.length > 0) {
  console.log("\nDuplicate canonicalWebtoonId samples:");
  console.table(duplicateCanonicalIds.slice(0, 20));
}

const samplePredicates = [
  [
    "missingOfficialUrl",
    (webtoon) => isEmpty(webtoon.officialUrl),
  ],
  [
    "invalidUrlStatus",
    (webtoon) => getMetadata(webtoon).urlStatus === "invalid",
  ],
  [
    "excludedInputStatus",
    (webtoon) =>
      getMetadata(webtoon).inputStatus === "excluded" ||
      webtoon.inputStatus === "excluded",
  ],
  [
    "missingRecommendationReason",
    (webtoon) => isEmpty(getRecommendation(webtoon).recommendationReason),
  ],
  [
    "missingGenreScores",
    (webtoon) => !isNonEmptyRecord(getRecommendation(webtoon).genreScores),
  ],
  [
    "missingTypeScores",
    (webtoon) =>
      !hasNonEmptyNestedScoreMap(getRecommendation(webtoon).typeScores),
  ],
  [
    "missingTagScores",
    (webtoon) => !isNonEmptyRecord(getRecommendation(webtoon).tagScores),
  ],
];

samplePredicates.forEach(([label, predicate]) => {
  const samples = sampleTitles(webtoons, predicate);

  if (samples.length > 0) {
    console.log(`\n${label} samples:`);
    console.table(samples);
  }
});

if (checks.missingOrEmptyAvoidanceTagScores > 0) {
  console.log(
    "\nwarning: avoidanceTagScores가 없거나 빈 작품이 있습니다. 리스크 신호가 없는 작품이면 blocker가 아닙니다."
  );
}

if (hardFailures.length > 0) {
  console.error(`\nSeed check failed: ${hardFailures.join(", ")}`);
  process.exit(1);
}

console.log("\nSeed check passed with 0 hard failures.");