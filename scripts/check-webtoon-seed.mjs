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

function getSourceDb(webtoon) {
  if (webtoon.sourceDb === "precision" || webtoon.sourceDb === "coverage") {
    return webtoon.sourceDb;
  }

  if (
    webtoon.sourceType === "precision" ||
    webtoon.sourceType === "coverage"
  ) {
    return webtoon.sourceType;
  }

  return "missing";
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
      sourceDb: getSourceDb(webtoon),
      recommendationEligible: webtoon.recommendationEligible,
      qualityEvidenceGateDecision: webtoon.qualityEvidenceGateDecision,
      urlStatus: getMetadata(webtoon).urlStatus,
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

function countSources(webtoons) {
  return webtoons.reduce((sourceCounts, webtoon) => {
    const sourceDb = getSourceDb(webtoon);
    sourceCounts[sourceDb] = (sourceCounts[sourceDb] ?? 0) + 1;
    return sourceCounts;
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

const recommendationEligibleItems = webtoons.filter(
  (webtoon) => webtoon.recommendationEligible === true
);

const checks = {
  total: webtoons.length,

  sourceDbCounts: countSources(webtoons),

  mainGenreCounts: countMainGenres(webtoons),

  duplicateCanonicalIds: duplicateCanonicalIds.length,

  missingCanonicalWebtoonId: countBy(webtoons, (webtoon) =>
    isEmpty(webtoon.canonicalWebtoonId)
  ),

  missingTitle: countBy(webtoons, (webtoon) => isEmpty(webtoon.title)),

  missingPlatform: countBy(webtoons, (webtoon) =>
    isEmpty(webtoon.platform)
  ),

  missingMainGenre: countBy(webtoons, (webtoon) =>
    isEmpty(webtoon.mainGenre)
  ),

  missingGenreScores: countBy(
    webtoons,
    (webtoon) =>
      !isNonEmptyRecord(getRecommendation(webtoon).genreScores)
  ),

  missingTypeScores: countBy(
    webtoons,
    (webtoon) =>
      !hasNonEmptyNestedScoreMap(
        getRecommendation(webtoon).typeScores
      )
  ),

  sourceDbMissing: countBy(
    webtoons,
    (webtoon) => getSourceDb(webtoon) === "missing"
  ),

  sourceDbSourceTypeMismatch: countBy(webtoons, (webtoon) => {
    const sourceDb = webtoon.sourceDb;
    const sourceType = webtoon.sourceType;

    if (isEmpty(sourceDb) || isEmpty(sourceType)) return false;

    return sourceDb !== sourceType;
  }),

  recommendationEligibleTrue: recommendationEligibleItems.length,

  eligibleSourceMissing: countBy(
    recommendationEligibleItems,
    (webtoon) => getSourceDb(webtoon) === "missing"
  ),

  eligibleCoverage: countBy(
    recommendationEligibleItems,
    (webtoon) => getSourceDb(webtoon) === "coverage"
  ),

  eligibleGateNotVerified: countBy(
    recommendationEligibleItems,
    (webtoon) =>
      webtoon.qualityEvidenceGateDecision !== "verified_precision"
  ),

  eligibleUrlStatusNotValid: countBy(
    recommendationEligibleItems,
    (webtoon) => getMetadata(webtoon).urlStatus !== "valid"
  ),

  eligibleOfficialUrlMissing: countBy(
    recommendationEligibleItems,
    (webtoon) => isEmpty(webtoon.officialUrl)
  ),

  eligibleQualityScoreMissing: countBy(
    recommendationEligibleItems,
    (webtoon) =>
      typeof getMetadata(webtoon).qualityScore !== "number"
  ),

  eligibleQualityFactorsMissing: countBy(
    recommendationEligibleItems,
    (webtoon) =>
      !isNonEmptyRecord(getMetadata(webtoon).qualityFactors)
  ),

  eligibleArtStyleScoresMissing: countBy(
    recommendationEligibleItems,
    (webtoon) =>
      !isNonEmptyRecord(
        getRecommendation(webtoon).artStyleScores
      )
  ),

  coverageOfficialUrlMissing: countBy(
    webtoons,
    (webtoon) =>
      getSourceDb(webtoon) === "coverage" &&
      isEmpty(webtoon.officialUrl)
  ),

  coverageMetadataStatusMissing: countBy(
    webtoons,
    (webtoon) =>
      getSourceDb(webtoon) === "coverage" &&
      isEmpty(getMetadata(webtoon).status)
  ),

  coverageMetadataUrlStatusMissing: countBy(
    webtoons,
    (webtoon) =>
      getSourceDb(webtoon) === "coverage" &&
      isEmpty(getMetadata(webtoon).urlStatus)
  ),

  coverageQualityScoreMissing: countBy(
    webtoons,
    (webtoon) =>
      getSourceDb(webtoon) === "coverage" &&
      typeof getMetadata(webtoon).qualityScore !== "number"
  ),

  coverageRecommendationReasonMissing: countBy(
    webtoons,
    (webtoon) =>
      getSourceDb(webtoon) === "coverage" &&
      isEmpty(
        getRecommendation(webtoon).recommendationReason
      )
  ),

  coverageTagScoresMissing: countBy(
    webtoons,
    (webtoon) =>
      getSourceDb(webtoon) === "coverage" &&
      !isNonEmptyRecord(
        getRecommendation(webtoon).tagScores
      )
  ),
};

const hardFailureKeys = [
  "duplicateCanonicalIds",
  "missingCanonicalWebtoonId",
  "missingTitle",
  "missingPlatform",
  "missingMainGenre",
  "missingGenreScores",
  "missingTypeScores",
  "eligibleSourceMissing",
  "eligibleCoverage",
  "eligibleGateNotVerified",
  "eligibleUrlStatusNotValid",
  "eligibleQualityScoreMissing",
  "eligibleQualityFactorsMissing",
  "eligibleArtStyleScoresMissing",
];

const hardFailures = hardFailureKeys.filter((key) => {
  return checks[key] > 0;
});

console.log("\n=== Unified webtoon seed check ===");
console.log(`seedPath: ${seedPath}\n`);
console.log(JSON.stringify(checks, null, 2));

if (duplicateCanonicalIds.length > 0) {
  console.log("\nDuplicate canonicalWebtoonId samples:");
  console.table(duplicateCanonicalIds.slice(0, 20));
}

const hardFailurePredicates = [
  [
    "eligibleSourceMissing",
    (webtoon) =>
      webtoon.recommendationEligible === true &&
      getSourceDb(webtoon) === "missing",
  ],
  [
    "eligibleCoverage",
    (webtoon) =>
      webtoon.recommendationEligible === true &&
      getSourceDb(webtoon) === "coverage",
  ],
  [
    "eligibleGateNotVerified",
    (webtoon) =>
      webtoon.recommendationEligible === true &&
      webtoon.qualityEvidenceGateDecision !==
        "verified_precision",
  ],
  [
    "eligibleUrlStatusNotValid",
    (webtoon) =>
      webtoon.recommendationEligible === true &&
      getMetadata(webtoon).urlStatus !== "valid",
  ],
];

hardFailurePredicates.forEach(([label, predicate]) => {
  const samples = sampleTitles(webtoons, predicate);

  if (samples.length > 0) {
    console.log(`\n${label} samples:`);
    console.table(samples);
  }
});

const warningPredicates = [
  [
    "eligibleOfficialUrlMissing",
    (webtoon) =>
      webtoon.recommendationEligible === true &&
      isEmpty(webtoon.officialUrl),
  ],
  [
    "sourceDbMissing",
    (webtoon) => getSourceDb(webtoon) === "missing",
  ],
  [
    "coverageTagScoresMissing",
    (webtoon) =>
      getSourceDb(webtoon) === "coverage" &&
      !isNonEmptyRecord(
        getRecommendation(webtoon).tagScores
      ),
  ],
];

warningPredicates.forEach(([label, predicate]) => {
  const samples = sampleTitles(webtoons, predicate);

  if (samples.length > 0) {
    console.log(`\nwarning: ${label} samples:`);
    console.table(samples);
  }
});

console.log(
  "\nPolicy note: Coverage는 검색/Primary 기준작 입력용이므로 URL·상태·품질·추천문구의 누락을 전역 hard failure로 취급하지 않습니다."
);

console.log(
  "Policy note: 추천 결과 후보는 runtime에서 explicit eligible + verified_precision + valid urlStatus + non-empty officialUrl을 모두 통과해야 합니다."
);

if (checks.eligibleOfficialUrlMissing > 0) {
  console.log(
    `\nwarning: recommendationEligible=true이지만 officialUrl이 비어 있는 작품 ${checks.eligibleOfficialUrlMissing}편은 runtime hard filter에서 제외되어야 하며 DB 후속 정규화 대상입니다.`
  );
}

if (checks.sourceDbMissing > 0) {
  console.log(
    `warning: sourceDb/sourceType 미지정 legacy 작품 ${checks.sourceDbMissing}편이 있습니다. recommendationEligible=true인 미지정 작품은 hard failure입니다.`
  );
}

if (hardFailures.length > 0) {
  console.error(
    `\nSeed check failed: ${hardFailures.join(", ")}`
  );
  process.exit(1);
}

console.log(
  "\nSeed check passed with 0 unified-DB hard failures."
);