import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const PROJECT_ROOT = process.cwd();
const ENTRY_TS = path.join(PROJECT_ROOT, "src/lib/recommendation/similarWorkRecommendation.ts");
const SEED_PATH = path.join(PROJECT_ROOT, "src/data/webtoons/webtoons_seed_current.json");
const TMP_ROOT = path.join(PROJECT_ROOT, ".qa-tmp/recommendation-regression");

const FIXTURES = {
  profiles: {
    S03: {
      genreScores: { fantasy: 5 },
      typeScores: {},
      tagScores: {},
      avoidanceTagScores: {},
      contentAxisScores: {},
      visualStyleMigrationStatus: "legacy_visual_appeal",
    },
    S04: {
      genreScores: { drama_daily: 5, romance_ropan: 4, fantasy: 3.5, murim: 1.5 },
      typeScores: {
        drama_life_realism: 3,
        romance_emotional_growth: 2,
        fantasy_truth_chaser: 1,
      },
      tagScores: {
        real_life_empathy: 3,
        relationship_bond: 3,
        story_immersion: 2,
        light_healing: 2,
        emotional_depth: 2,
      },
      avoidanceTagScores: {
        graphic_intensity: 2,
        heavy_tone: 1,
        relationship_stress: 1,
      },
      contentAxisScores: {},
      visualStyleMigrationStatus: "legacy_visual_appeal",
    },
    D01: {
      genreScores: { drama_daily: 5 },
      typeScores: { drama_healing_daily: 3, drama_life_realism: 2 },
      tagScores: {
        light_healing: 3,
        real_life_empathy: 3,
        relationship_bond: 2,
        emotional_depth: 2,
      },
      avoidanceTagScores: { heavy_tone: 2, graphic_intensity: 2 },
      contentAxisScores: {},
      visualStyleMigrationStatus: "legacy_visual_appeal",
    },
  },
  cases: [
    { caseId: "P01", category: "Primary", name: "정밀 1편 단독", selectedTitles: ["나 혼자만 레벨업"] },
    { caseId: "P02", category: "Primary", name: "동일 장르 3편", selectedTitles: ["전지적 독자 시점", "나 혼자만 레벨업", "무한의 마법사"] },
    { caseId: "P03", category: "Primary", name: "혼합 장르 3편+프로필", selectedTitles: ["나 혼자만 레벨업", "유미의 세포들", "스위트홈"], profileKey: "S04" },
    { caseId: "P04", category: "Primary", name: "물리 이동 작품 기준", selectedTitles: ["유미의 세포들"] },
    { caseId: "P05", category: "Primary", name: "Coverage 단독 기준작", selectedTitles: ["평범한 8반"] },
    { caseId: "P06", category: "Primary", name: "정밀+Coverage 혼합", selectedTitles: ["유미의 세포들", "평범한 8반"] },
    { caseId: "S01", category: "Secondary", name: "프로필 없음", profile: null },
    { caseId: "S02", category: "Secondary", name: "0점 프로필", profile: { genreScores: {}, typeScores: {}, tagScores: {}, avoidanceTagScores: {}, contentAxisScores: {} } },
    { caseId: "S03", category: "Secondary", name: "장르 양수 1개", profileKey: "S03" },
    { caseId: "S04", category: "Secondary", name: "다축 실제형 프로필", profileKey: "S04" },
    { caseId: "D01", category: "Detail CTA", name: "드라마 힐링 세부취향", profileKey: "D01", sourceTestKey: "drama_daily_detail" },
  ],
};

function parseArgs(argv) {
  const result = { report: null, keepTmp: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") {
      result.report = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--keep-tmp") {
      result.keepTmp = true;
    }
  }
  return result;
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
}

function outputPathFor(sourcePath) {
  const relative = path.relative(PROJECT_ROOT, sourcePath);
  const withoutExtension = relative.replace(/\.(?:tsx?|mts)$/, "");
  return path.join(TMP_ROOT, `${withoutExtension}.js`);
}

function ensureDotRelative(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

function findLocalSource(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mts`,
    `${basePath}.js`,
    `${basePath}.json`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.mts"),
    path.join(basePath, "index.js"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolveLocalSpecifier(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    return findLocalSource(path.join(PROJECT_ROOT, "src", specifier.slice(2)));
  }
  if (specifier.startsWith(".")) {
    return findLocalSource(path.resolve(path.dirname(fromFile), specifier));
  }
  return null;
}

function rewriteAliasSpecifiers(sourceText, sourceFile) {
  return sourceText.replace(/(["'])@\/([^"'`\n]+)\1/g, (fullMatch, quote, aliasPath) => {
    const targetSource = findLocalSource(path.join(PROJECT_ROOT, "src", aliasPath));
    if (!targetSource) return fullMatch;
    const targetWithoutExtension = targetSource.replace(/\.(?:tsx?|mts|js|json)$/, "");
    const relative = path.relative(path.dirname(sourceFile), targetWithoutExtension);
    return `${quote}${ensureDotRelative(relative)}${quote}`;
  });
}

function compileModuleGraph(entryFile) {
  const requireFromProject = createRequire(path.join(PROJECT_ROOT, "package.json"));
  const ts = requireFromProject("typescript");
  const visited = new Set();

  function visit(sourceFile) {
    const absoluteSource = path.resolve(sourceFile);
    if (visited.has(absoluteSource)) return;
    visited.add(absoluteSource);

    if (absoluteSource.endsWith(".json")) {
      const target = path.join(TMP_ROOT, path.relative(PROJECT_ROOT, absoluteSource));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(absoluteSource, target);
      return;
    }

    const sourceText = fs.readFileSync(absoluteSource, "utf8");
    const preprocessed = ts.preProcessFile(sourceText, true, true);
    const importSpecifiers = new Set([
      ...preprocessed.importedFiles.map((item) => item.fileName),
      ...preprocessed.referencedFiles.map((item) => item.fileName),
    ]);

    for (const specifier of importSpecifiers) {
      const dependency = resolveLocalSpecifier(specifier, absoluteSource);
      if (dependency) visit(dependency);
    }

    const transpiled = ts.transpileModule(
      rewriteAliasSpecifiers(sourceText, absoluteSource),
      {
        fileName: absoluteSource,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          moduleResolution: ts.ModuleResolutionKind.NodeJs,
          esModuleInterop: true,
          allowJs: true,
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }
    );

    const fatalDiagnostics = (transpiled.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    if (fatalDiagnostics.length > 0) {
      const details = fatalDiagnostics
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        .join("\n");
      throw new Error(`TypeScript transpile failed: ${absoluteSource}\n${details}`);
    }

    const targetFile = outputPathFor(absoluteSource);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, transpiled.outputText, "utf8");
  }

  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  visit(entryFile);
  return outputPathFor(entryFile);
}

function createMemoryStorage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key) { return data.has(String(key)) ? data.get(String(key)) : null; },
    key(index) { return [...data.keys()][index] ?? null; },
    removeItem(key) { data.delete(String(key)); },
    setItem(key, value) { data.set(String(key), String(value)); },
  };
}

function installBrowserStorageStub() {
  const storage = createMemoryStorage();
  globalThis.window = globalThis.window ?? {};
  globalThis.localStorage = storage;
  return storage;
}

function setPrimaryProfile(storage, profile) {
  storage.clear();
  if (!profile) return;
  storage.setItem(
    "webtoon_genre_preference_result",
    JSON.stringify({ finalGenreScores: profile.genreScores, tagScores: {} })
  );
  storage.setItem(
    "webtoon_drama_daily_detail_result",
    JSON.stringify({
      branchScores: profile.typeScores,
      tagScores: profile.tagScores,
      avoidanceTagScores: profile.avoidanceTagScores,
      artStyleScores: {},
    })
  );
}

function toStoredProfile(profile, key) {
  return {
    sourceKeys: [`qa:${key}`],
    userGenreScores: { ...profile.genreScores },
    userTypeScores: { ...profile.typeScores },
    userTagScores: { ...profile.tagScores },
    userAvoidanceScores: { ...profile.avoidanceTagScores },
  };
}

function toRecommendationVector(profile) {
  return {
    genreScores: { ...profile.genreScores },
    typeScores: { ...profile.typeScores },
    tagScores: { ...profile.tagScores },
    avoidanceTagScores: { ...profile.avoidanceTagScores },
    contentAxisScores: { ...profile.contentAxisScores },
    visualStyleMigrationStatus: profile.visualStyleMigrationStatus,
  };
}

function findExactTitle(allWebtoons, title) {
  const matches = allWebtoons.filter((webtoon) => webtoon.title === title);
  if (matches.length !== 1) {
    throw new Error(`Fixture title must resolve to exactly one row: "${title}" (found ${matches.length})`);
  }
  return matches[0];
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function stableSnapshot(result) {
  return {
    mode: result.mode,
    recommendationMode: result.recommendationMode,
    vectorSource: result.vectorSource,
    sourceTestKey: result.sourceTestKey ?? null,
    selectedIds: result.selectedWebtoons.map((item) => item.canonicalWebtoonId),
    candidatePoolIds: result.candidatePoolIds,
    mainDisplayIds: result.mainDisplayItems.map((item) => item.candidate.canonicalWebtoonId),
    mainReserveIds: result.mainReservePool.map((item) => item.candidate.canonicalWebtoonId),
    expansionCandidateIds: result.expansionCandidatePool.map((item) => item.candidate.canonicalWebtoonId),
    expansionDisplayIds: result.expansionDisplayItems.map((item) => item.candidate.canonicalWebtoonId),
    expandReserveIds: result.expandReservePool.map((item) => item.candidate.canonicalWebtoonId),
  };
}

function collectRecommendationItems(result) {
  const byId = new Map();
  [...result.mainDisplayItems, ...result.mainReservePool, ...result.expansionCandidatePool].forEach((item) => {
    byId.set(item.candidate.canonicalWebtoonId, item);
  });
  return [...byId.values()];
}

function findNonFiniteNumbers(value, pathParts = [], output = []) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) output.push(pathParts.join("."));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findNonFiniteNumbers(item, [...pathParts, String(index)], output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => findNonFiniteNumbers(item, [...pathParts, key], output));
  }
  return output;
}

function addCheck(checks, id, passed, detail) {
  checks.push({ id, passed: Boolean(passed), detail });
}

function checkStrictCandidateBoundary(result, seedById, checks) {
  const bad = [];
  for (const id of result.candidatePoolIds) {
    const work = seedById.get(id);
    if (!work) { bad.push({ id, reason: "missing_seed_row" }); continue; }
    if (work.sourceDb === "coverage") { bad.push({ id, reason: "coverage" }); continue; }
    if (work.recommendationEligible !== true) { bad.push({ id, reason: "not_explicit_eligible" }); continue; }
    if (work.qualityEvidenceGateDecision !== "verified_precision") { bad.push({ id, reason: "gate_not_verified" }); continue; }
    if (typeof work.officialUrl !== "string" || work.officialUrl.trim() === "") { bad.push({ id, reason: "missing_official_url" }); continue; }
    if (work.metadata.urlStatus !== "valid") bad.push({ id, reason: "url_status_not_valid" });
  }
  addCheck(
    checks,
    "candidatePool:strict-boundary",
    bad.length === 0,
    bad.length === 0 ? `${result.candidatePoolIds.length} candidates all strict` : JSON.stringify(bad.slice(0, 10))
  );
}

function checkCommonActiveCase({ caseDef, result, secondResult, selectedWebtoons, seedById }) {
  const checks = [];
  const isPrimary = caseDef.category === "Primary";
  const expectedPoolSize = isPrimary ? 100 : 50;
  const displayed = [...result.mainDisplayItems, ...result.expansionDisplayItems];
  const displayedIds = displayed.map((item) => item.candidate.canonicalWebtoonId);
  const selectedIds = new Set(selectedWebtoons.map((item) => item.canonicalWebtoonId));

  addCheck(checks, "scoreVersion", result.scoreVersion === "now_webtoon_finder_v2_1_2", result.scoreVersion);
  addCheck(checks, "candidatePoolSize", result.candidatePoolSize === expectedPoolSize, `${result.candidatePoolSize}/${expectedPoolSize}`);
  addCheck(checks, "mainDisplay:5", result.mainDisplayItems.length === 5, String(result.mainDisplayItems.length));
  addCheck(checks, "expansionDisplay:5", result.expansionDisplayItems.length === 5, String(result.expansionDisplayItems.length));
  addCheck(checks, "mainReserve:10", result.mainReservePool.length === 10, String(result.mainReservePool.length));
  addCheck(checks, "expandReserve:30", result.expandReservePool.length === 30, String(result.expandReservePool.length));
  addCheck(checks, "displayed:canonical-duplicate-0", new Set(displayedIds).size === displayedIds.length, `${new Set(displayedIds).size}/${displayedIds.length} unique`);

  const selectedExposure = displayedIds.filter((id) => selectedIds.has(id));
  addCheck(checks, "displayed:selected-source-0", selectedExposure.length === 0, selectedExposure.length === 0 ? "none" : selectedExposure.join(", "));

  const coverageExposure = displayedIds.filter((id) => seedById.get(id)?.sourceDb === "coverage");
  addCheck(checks, "displayed:coverage-0", coverageExposure.length === 0, coverageExposure.length === 0 ? "none" : coverageExposure.join(", "));

  checkStrictCandidateBoundary(result, seedById, checks);

  const nonFinitePaths = findNonFiniteNumbers(result);
  addCheck(checks, "numbers:finite", nonFinitePaths.length === 0, nonFinitePaths.length === 0 ? "all finite" : nonFinitePaths.slice(0, 10).join(", "));

  const formulaFailures = collectRecommendationItems(result)
    .filter((item) => round4(item.effectiveTasteScore * 0.75 + item.successConfidenceScore * 0.25) !== item.displayRecommendationScore)
    .map((item) => item.candidate.canonicalWebtoonId);
  addCheck(checks, "displayScore:formula", formulaFailures.length === 0, formulaFailures.length === 0 ? "match" : formulaFailures.join(", "));

  const deterministic = JSON.stringify(stableSnapshot(result)) === JSON.stringify(stableSnapshot(secondResult));
  addCheck(checks, "deterministic", deterministic, deterministic ? "same input = same result" : "snapshot mismatch");

  if (caseDef.caseId === "P03") {
    addCheck(
      checks,
      "P03:primary-8-2",
      result.blendingWeights.selectedWorkTasteScore === 0.8 && result.blendingWeights.profileTasteScore === 0.2,
      JSON.stringify(result.blendingWeights)
    );
  }

  if (caseDef.caseId === "P04") {
    const selected = selectedWebtoons[0];
    addCheck(
      checks,
      "P04:romance-canonical",
      selected?.canonicalWebtoonId === "wt_romance_ropan_232" && selected?.mainGenre === "romance_ropan",
      selected ? `${selected.canonicalWebtoonId}/${selected.mainGenre}` : "missing"
    );
  }

  if (caseDef.caseId === "P05") {
    const selected = selectedWebtoons[0];
    addCheck(
      checks,
      "P05:coverage-input-weight",
      selected?.sourceDb === "coverage" && selected?.sourceWeight === 0.4,
      selected ? `${selected.sourceDb}/${selected.sourceWeight}` : "missing"
    );
  }

  if (caseDef.caseId === "P06") {
    const hasPrecision = selectedWebtoons.some((item) => item.sourceDb === "precision" && item.sourceWeight === 1);
    const hasCoverage = selectedWebtoons.some((item) => item.sourceDb === "coverage" && item.sourceWeight === 0.4);
    addCheck(checks, "P06:precision-coverage-weights", hasPrecision && hasCoverage, JSON.stringify(selectedWebtoons.map((item) => ({ title: item.title, sourceDb: item.sourceDb, sourceWeight: item.sourceWeight }))));
    addCheck(checks, "P06:source-weight-sum", result.similarWorkSessionVector?.sourceWeightSum === 1.4, String(result.similarWorkSessionVector?.sourceWeightSum ?? "missing"));
  }

  if (caseDef.caseId === "S03" || caseDef.caseId === "S04") {
    addCheck(
      checks,
      `${caseDef.caseId}:vector-source`,
      result.vectorSource === "user_taste_profile" && result.recommendationMode === "instant_recommendation",
      `${result.recommendationMode}/${result.vectorSource}`
    );
  }

  if (caseDef.caseId === "D01") {
    addCheck(
      checks,
      "D01:detail-source",
      result.vectorSource === "detail_test_result" && result.sourceTestKey === "drama_daily_detail",
      `${result.vectorSource}/${result.sourceTestKey}`
    );
    addCheck(
      checks,
      "D01:no-profile-auto-mix",
      result.profileSnapshot === null &&
        result.storedUserTasteProfile === null &&
        result.blendingWeights.detailTestTasteScore === 1 &&
        result.blendingWeights.profileTasteScore === 0,
      JSON.stringify({
        profileSnapshot: result.profileSnapshot,
        storedUserTasteProfile: result.storedUserTasteProfile,
        blendingWeights: result.blendingWeights,
      })
    );
  }

  return checks;
}

function runPrimaryCase({ caseDef, allWebtoons, api, storage, seedById }) {
  setPrimaryProfile(storage, caseDef.profileKey ? FIXTURES.profiles[caseDef.profileKey] : null);
  const selectedWebtoons = caseDef.selectedTitles.map((title) => findExactTitle(allWebtoons, title));
  const runOnce = () => api.createSimilarWorkSelectionResult({ selectedWebtoons, allWebtoons });
  const result = runOnce();
  const secondResult = runOnce();
  return { result, checks: checkCommonActiveCase({ caseDef, result, secondResult, selectedWebtoons, seedById }) };
}

function runSecondaryCase({ caseDef, allWebtoons, api, storage, seedById }) {
  storage.clear();

  if (caseDef.caseId === "S01" || caseDef.caseId === "S02") {
    const storedProfile =
      caseDef.caseId === "S01"
        ? null
        : { sourceKeys: ["qa:S02"], userGenreScores: {}, userTypeScores: {}, userTagScores: {}, userAvoidanceScores: {} };
    let errorMessage = null;
    try {
      api.createInstantRecommendationSelectionResult({ allWebtoons, storedUserTasteProfile: storedProfile });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    const checks = [];
    addCheck(checks, "inactive-secondary", errorMessage === "SECONDARY_TASTE_PROFILE_NOT_READY", errorMessage ?? "no error");
    return { result: null, checks };
  }

  const fixture = FIXTURES.profiles[caseDef.profileKey];
  const storedProfile = toStoredProfile(fixture, caseDef.profileKey);
  const runOnce = () => api.createInstantRecommendationSelectionResult({ allWebtoons, storedUserTasteProfile: storedProfile });
  const result = runOnce();
  const secondResult = runOnce();
  return { result, checks: checkCommonActiveCase({ caseDef, result, secondResult, selectedWebtoons: [], seedById }) };
}

function runDetailCase({ caseDef, allWebtoons, api, storage, seedById }) {
  storage.clear();
  const fixture = FIXTURES.profiles[caseDef.profileKey];
  const activeRecommendationVector = toRecommendationVector(fixture);
  const runOnce = () =>
    api.createDetailTestRecommendationSelectionResult({
      sourceTestKey: caseDef.sourceTestKey,
      activeRecommendationVector,
      allWebtoons,
    });
  const result = runOnce();
  const secondResult = runOnce();
  return { result, checks: checkCommonActiveCase({ caseDef, result, secondResult, selectedWebtoons: [], seedById }) };
}

function compactCaseResult(caseDef, execution) {
  const failedChecks = execution.checks
    .filter((check) => !check.passed)
    .map((check) => ({ id: check.id, detail: check.detail }));
  const result = execution.result;
  return {
    caseId: caseDef.caseId,
    category: caseDef.category,
    name: caseDef.name,
    status: failedChecks.length === 0 ? "PASS" : "FAIL",
    passedChecks: execution.checks.length - failedChecks.length,
    totalChecks: execution.checks.length,
    failedChecks,
    candidatePoolSize: result?.candidatePoolSize ?? null,
    displayedCount: result ? result.mainDisplayItems.length + result.expansionDisplayItems.length : 0,
    mainReserveCount: result?.mainReservePool.length ?? null,
    expandReserveCount: result?.expandReservePool.length ?? null,
    top10Titles: result ? [...result.mainDisplayItems, ...result.expansionDisplayItems].map((item) => item.candidate.title) : [],
  };
}

function printCaseSummary(caseResult) {
  const symbol = caseResult.status === "PASS" ? "✓" : "✗";
  console.log(`${symbol} ${caseResult.caseId} ${caseResult.name} — ${caseResult.status}`);
  if (caseResult.status === "FAIL") {
    caseResult.failedChecks.forEach((failure) => console.log(`    - ${failure.id}: ${failure.detail}`));
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  assertFile(ENTRY_TS, "Recommendation source");
  assertFile(SEED_PATH, "Current seed");

  const storage = installBrowserStorageStub();
  const compiledEntry = compileModuleGraph(ENTRY_TS);
  const requireCompiled = createRequire(path.join(TMP_ROOT, "qa-loader.cjs"));
  const api = requireCompiled(compiledEntry);

  const rawSeed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  const allWebtoons = api.normalizeWebtoonSeedData(rawSeed);
  const seedById = new Map(allWebtoons.map((item) => [item.canonicalWebtoonId, item]));
  const caseResults = [];

  console.log("\n=== Recommendation regression QA ===");
  console.log(`seed rows(raw): ${rawSeed.length}`);
  console.log(`seed rows(normalized): ${allWebtoons.length}`);
  console.log(`runtime scoreVersion: ${api.FIND_RECOMMENDATION_SCORE_VERSION}`);
  console.log("");

  for (const caseDef of FIXTURES.cases) {
    let execution;
    try {
      if (caseDef.category === "Primary") {
        execution = runPrimaryCase({ caseDef, allWebtoons, api, storage, seedById });
      } else if (caseDef.category === "Secondary") {
        execution = runSecondaryCase({ caseDef, allWebtoons, api, storage, seedById });
      } else {
        execution = runDetailCase({ caseDef, allWebtoons, api, storage, seedById });
      }
    } catch (error) {
      execution = {
        result: null,
        checks: [{
          id: "case-runtime",
          passed: false,
          detail: error instanceof Error ? error.stack ?? error.message : String(error),
        }],
      };
    }

    const caseResult = compactCaseResult(caseDef, execution);
    caseResults.push(caseResult);
    printCaseSummary(caseResult);
  }

  const passed = caseResults.filter((item) => item.status === "PASS").length;
  const failed = caseResults.length - passed;
  const report = {
    version: "recommendation_regression_qa_current_v1",
    generatedAt: new Date().toISOString(),
    basis: {
      seedPath: path.relative(PROJECT_ROOT, SEED_PATH),
      runtimeSource: path.relative(PROJECT_ROOT, ENTRY_TS),
      fixture: "recommendation_regression_cases_v0_2_v0206 embedded",
    },
    totals: { cases: caseResults.length, passed, failed },
    status: failed === 0 ? "passed" : "failed",
    caseResults,
  };

  console.log("\n=== Summary ===");
  console.log(JSON.stringify({ cases: report.totals.cases, passed, failed, status: report.status }, null, 2));

  if (args.report) {
    const reportPath = path.resolve(PROJECT_ROOT, args.report);
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`\nreport: ${path.relative(PROJECT_ROOT, reportPath)}`);
  }

  if (!args.keepTmp) fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  process.exitCode = failed === 0 ? 0 : 1;
}

try {
  main();
} catch (error) {
  console.error("\nQA runner failed before case execution.");
  console.error(error);
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  process.exitCode = 1;
}
