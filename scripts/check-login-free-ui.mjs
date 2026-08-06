#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const args = process.argv.slice(2);
const reportIndex = args.indexOf("--report");
const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : null;

const results = [];

function resolve(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(resolve(relativePath), "utf8");
}

function addCheck(id, passed, detail) {
  results.push({ id, passed: Boolean(passed), detail });
}

function requireFile(relativePath) {
  const exists = fs.existsSync(resolve(relativePath));
  addCheck(`file:${relativePath}`, exists, exists ? "exists" : "missing");
}

function contains(relativePath, expected, id) {
  const source = read(relativePath);
  addCheck(id, source.includes(expected), expected);
}

function excludes(relativePath, forbidden, id) {
  const source = read(relativePath);
  addCheck(id, !source.includes(forbidden), forbidden);
}

const requiredFiles = [
  "src/app/page.tsx",
  "src/app/find/page.tsx",
  "src/app/find/results/page.tsx",
  "src/app/tests/page.tsx",
  "src/app/genre-preference/page.tsx",
  "src/app/loading.tsx",
  "src/app/error.tsx",
  "src/app/not-found.tsx",
  "src/components/layout/BrandBar.tsx",
  "src/components/ui/StatePanel.tsx",
  "src/components/tests/DetailTestClient.tsx",
  "src/components/tests/genrePreference/GenrePreferenceClient.tsx",
  "src/lib/storage/testProgressStorage.ts",
  "src/data/tests/detailChoiceImages.ts",
  "src/data/tests/resultObjectImages.ts",
];
requiredFiles.forEach(requireFile);

const css = read("src/app/globals.css");
[
  "--brand-ivory: #fcfaf5",
  "--brand-navy: #17324d",
  "--brand-mint: #53d8bd",
  "--content-max: 1200px",
  "--test-max: 900px",
  "--result-max: 1100px",
  "@media (max-width: 767px)",
  "@media (max-width: 1199px)",
  "overflow-x: hidden",
].forEach((token) =>
  addCheck(`css:${token}`, css.includes(token), token)
);

const bannedPurpleHexes = [
  "#4f46e5",
  "#6d28d9",
  "#7c3aed",
  "#8b5cf6",
  "#9333ea",
  "#a855f7",
];
const uiSources = [
  "src/app/globals.css",
  "src/app/page.tsx",
  "src/app/find/page.tsx",
  "src/app/find/results/page.tsx",
  "src/app/tests/page.tsx",
  "src/components/layout/BrandBar.tsx",
  "src/components/find/RecommendationCard.tsx",
  "src/components/tests/DetailTestClient.tsx",
  "src/components/tests/genrePreference/GenrePreferenceClient.tsx",
]
  .map(read)
  .join("\n")
  .toLowerCase();
addCheck(
  "palette:no-prototype-purple",
  bannedPurpleHexes.every((hex) => !uiSources.includes(hex)),
  "banned purple prototype colors are absent"
);

const visibleShellSources = [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/components/layout/BrandBar.tsx",
]
  .map(read)
  .join("\n");
addCheck(
  "auth:no-visible-login-ui",
  !/KakaoLoginButton|AuthStatusPanel|카카오로 로그인|로그아웃|프로필/.test(
    visibleShellSources
  ),
  "login/profile UI is not rendered in the login-free UI freeze"
);
addCheck(
  "auth:no-login-copy-on-home",
  !/로그인/.test(read("src/app/page.tsx")),
  "home page does not mention login"
);

contains(
  "src/app/find/page.tsx",
  "재밌게 본 웹툰을 골라주세요",
  "find:approved-heading"
);
excludes("src/app/find/page.tsx", "sourceWeight", "find:no-source-weight-copy");
contains(
  "src/app/find/results/page.tsx",
  "취향에 맞는 웹툰을 찾고 있어요",
  "results:approved-loading-copy"
);
contains(
  "src/components/find/FindRecommendationResult.tsx",
  "오늘은 이런 웹툰이 잘 맞을 것 같아요.",
  "results:approved-heading"
);
contains(
  "src/components/find/SelectedSourceWorks.tsx",
  "재밌게 봤던 작품",
  "results:selected-source-heading"
);
const cardSource = read("src/components/find/RecommendationCard.tsx");
addCheck(
  "results:no-ranking-label",
  !/TOP\s*\d|\d위/.test(cardSource),
  "recommendation cards do not render rankings"
);
addCheck(
  "results:no-fallback-taste-tag",
  !cardSource.includes("#취향 접점"),
  "empty matched tags do not render a generic fallback"
);
addCheck(
  "results:no-cover-component",
  !cardSource.includes("WebtoonCover"),
  "recommendation cards are text-first without managed cover images"
);
addCheck(
  "results:debug-development-only",
  cardSource.includes('process.env.NODE_ENV === "development"'),
  "raw recommendation debug data is development-only"
);

contains(
  "src/app/tests/page.tsx",
  "장르별 세부 취향 테스트",
  "tests:detail-section"
);
contains(
  "src/components/tests/genrePreference/GenrePreferenceClient.tsx",
  "260",
  "genre-preference:auto-advance-delay"
);
contains(
  "src/components/tests/genrePreference/GenrePreferenceResultView.tsx",
  "내 웹툰 세계관 지도",
  "genre-preference:result-title"
);
contains(
  "src/components/tests/genrePreference/GenrePreferenceActions.tsx",
  'href="/find"',
  "genre-preference:find-cta"
);

const detailSource = read("src/components/tests/DetailTestClient.tsx");
addCheck(
  "detail:q1-q4-image-rule",
  /currentQuestionIndex\s*===\s*0/.test(detailSource) &&
    /currentQuestionIndex\s*===\s*3/.test(detailSource),
  "Q1 and Q4 image-card rendering conditions are present"
);
addCheck(
  "detail:progress-storage",
  detailSource.includes("loadDetailTestProgress") &&
    detailSource.includes("saveDetailTestProgress") &&
    detailSource.includes("clearDetailTestProgress"),
  "detail test draft save/restore is wired"
);
const genreClientSource = read(
  "src/components/tests/genrePreference/GenrePreferenceClient.tsx"
);
addCheck(
  "genre-preference:progress-storage",
  genreClientSource.includes("loadGenrePreferenceProgress") &&
    genreClientSource.includes("saveGenrePreferenceProgress") &&
    genreClientSource.includes("clearGenrePreferenceProgress"),
  "genre preference draft save/restore is wired"
);

function imagePathsFrom(relativePath) {
  const source = read(relativePath);
  return [...new Set([...source.matchAll(/"(\/images\/[^"\n]+)"/g)].map((m) => m[1]))];
}

function checkImageRegistry(relativePath, expectedUniqueCount, id) {
  const paths = imagePathsFrom(relativePath);
  const missing = paths.filter(
    (assetPath) => !fs.existsSync(resolve(path.join("public", assetPath)))
  );
  addCheck(
    `${id}:count`,
    paths.length === expectedUniqueCount,
    `expected ${expectedUniqueCount}, found ${paths.length}`
  );
  addCheck(
    `${id}:files`,
    missing.length === 0,
    missing.length === 0 ? "all assets exist" : `missing: ${missing.join(", ")}`
  );
}

checkImageRegistry("src/data/tests/detailChoiceImages.ts", 50, "images:detail-q1-q4");
checkImageRegistry("src/data/tests/resultObjectImages.ts", 29, "images:detail-results");

const genrePreferenceAssets = fs
  .readdirSync(resolve("public/images/genre-preference"))
  .filter((name) => /\.png$/i.test(name));
addCheck(
  "images:genre-preference-count",
  genrePreferenceAssets.length === 20,
  `expected 20, found ${genrePreferenceAssets.length}`
);

const tsxFiles = [];
function collectFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(fullPath);
    else if (/\.(ts|tsx)$/.test(entry.name)) tsxFiles.push(fullPath);
  }
}
collectFiles(resolve("src"));
const syntaxFailures = [];
for (const fullPath of tsxFiles) {
  const source = fs.readFileSync(fullPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: fullPath,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors.length > 0) {
    syntaxFailures.push({
      file: path.relative(root, fullPath),
      messages: errors.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")
      ),
    });
  }
}
addCheck(
  "syntax:typescript-tsx",
  syntaxFailures.length === 0,
  syntaxFailures.length === 0 ? `${tsxFiles.length} files parsed` : syntaxFailures
);

const trailingWhitespace = [];
for (const relativePath of [
  ...requiredFiles,
  "src/components/find/RecommendationCard.tsx",
  "src/components/find/FindRecommendationResult.tsx",
  "src/components/tests/genrePreference/GenrePreferenceResultView.tsx",
]) {
  if (!fs.existsSync(resolve(relativePath))) continue;
  read(relativePath)
    .split("\n")
    .forEach((line, index) => {
      if (/[ \t]+$/.test(line)) trailingWhitespace.push(`${relativePath}:${index + 1}`);
    });
}
addCheck(
  "format:no-trailing-whitespace",
  trailingWhitespace.length === 0,
  trailingWhitespace.length === 0 ? "none" : trailingWhitespace
);

const failed = results.filter((item) => !item.passed);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? "passed" : "failed",
  totals: {
    checks: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  scope: "login-free UI integration static QA",
  checks: results,
};

const output = JSON.stringify(report, null, 2);
console.log(output);
if (reportPath) {
  const target = path.isAbsolute(reportPath) ? reportPath : resolve(reportPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${output}\n`, "utf8");
}
if (failed.length > 0) process.exitCode = 1;