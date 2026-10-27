import { CATALOG_GENRE_SCORE_KEYS, CATALOG_TYPE_PARENT_KEYS, isPreservedActionGenreScore } from './webtoon-catalog-schema.mjs';

export const CURRENT_CATALOG_VERSION = 'webtoons_seed_v0_797_integrated_20261023';
export const VECTOR_AXES = ['genreScores', 'typeScores', 'tagScores', 'avoidanceTagScores', 'contentAxisScores', 'artStyleScores'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' ? value.trim() : '';

function validateMap(value, name, maximum, required) {
  if (value === undefined && !required) return;
  if (!record(value) || (required && !Object.keys(value).length)) throw new Error(`INVALID_SCORE_MAP:${name}`);
  for (const [key, score] of Object.entries(value)) {
    if (!key || !Number.isInteger(score) || score < 0 || score > maximum) throw new Error(`INVALID_SCORE:${name}.${key}`);
  }
}

export function validateCatalogWork(item) {
  const eligible = item.recommendationEligible === true;
  if (typeof item.recommendationEligible !== 'boolean') throw new Error('EXPLICIT_ELIGIBILITY_REQUIRED');
  const recommendation = item.recommendation;
  // Coverage may have no reviewed vector. Keep absence in raw_data; never fabricate zeros.
  if (recommendation === undefined && !eligible) return;
  if (!record(recommendation)) throw new Error('INVALID_RECOMMENDATION');
  validateMap(recommendation.genreScores, 'genreScores', 5, eligible);
  for (const key of Object.keys(recommendation.genreScores ?? {})) {
    if (!CATALOG_GENRE_SCORE_KEYS.includes(key) && !(key === 'action' && isPreservedActionGenreScore(item))) throw new Error(`UNKNOWN_GENRE:${key}`);
  }
  if (recommendation.typeScores !== undefined || eligible) {
    if (!record(recommendation.typeScores)) throw new Error('INVALID_TYPE_SCORES');
    if (eligible && !Object.values(recommendation.typeScores).some(scores => record(scores) && Object.keys(scores).length)) throw new Error('EMPTY_TYPE_SCORES');
    for (const [key, scores] of Object.entries(recommendation.typeScores)) {
      if (!CATALOG_TYPE_PARENT_KEYS.includes(key)) throw new Error(`UNKNOWN_TYPE_PARENT:${key}`);
      validateMap(scores, `typeScores.${key}`, 3, false);
    }
  }
  for (const axis of VECTOR_AXES.slice(2)) validateMap(recommendation[axis], axis, 3, false);
  if (eligible && (item.sourceDb !== 'precision' || item.qualityEvidenceGateDecision !== 'verified_precision' || item.metadata?.urlStatus !== 'valid' || !/^https:\/\//.test(text(item.officialUrl)))) throw new Error('ELIGIBILITY_GATE_FAILED');
}

export function buildCatalogRows(source, version = CURRENT_CATALOG_VERSION) {
  if (!Array.isArray(source)) throw new Error('CATALOG_ARRAY_REQUIRED');
  if (!source.length) throw new Error('EMPTY_CATALOG');
  const seen = new Set();
  return source.map(item => {
    const id = text(item.canonicalWebtoonId);
    const title = text(item.title);
    const platform = text(item.platform);
    const genre = text(item.mainGenre) || (item.recommendationEligible === false ? text(item.sourceDbGenre) : '');
    if (!id || !title || !platform || !genre) throw new Error(`REQUIRED_CATALOG_FIELD:${id}`);
    if (seen.has(id)) throw new Error(`DUPLICATE_CATALOG_ID:${id}`);
    seen.add(id);
    try { validateCatalogWork(item); } catch (error) { throw new Error(`${id}:${error.message}`); }
    return {
      canonical_webtoon_id: id, title, normalized_title: title.normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR'),
      platform, official_url: text(item.officialUrl) || null, main_genre: genre,
      recommendation_eligible: item.recommendationEligible === true,
      catalog_status: ['active', 'hidden', 'retired'].includes(item.catalogStatus) ? item.catalogStatus : 'active',
      raw_data: item, catalog_version: version,
    };
  });
}

export function importedDetailData(item) {
  const metadata = item.metadata ?? {};
  return Object.fromEntries(Object.entries({
    status: text(metadata.status) || null,
    ageRating: text(metadata.ageRating) || null,
    statusCheckedAt: text(metadata.statusCheckedAt) || null,
    sourceUrl: text(item.officialUrl) || null,
  }).filter(([, value]) => value !== null));
}

const canonical = value => JSON.stringify(value, (key, item) => record(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export function catalogDiff(rows, existing) {
  const previous = new Map(existing.map(row => [row.canonical_webtoon_id, row]));
  const added = [], vectorsChanged = [], retired = [], eligibilityChanged = [];
  const ids = new Set(rows.map(row => row.canonical_webtoon_id));
  for (const row of rows) {
    const old = previous.get(row.canonical_webtoon_id);
    if (!old) { added.push(row.canonical_webtoon_id); continue; }
    if (VECTOR_AXES.some(axis => canonical(old.raw_data?.recommendation?.[axis]) !== canonical(row.raw_data?.recommendation?.[axis]))) vectorsChanged.push(row.canonical_webtoon_id);
    if (old.recommendation_eligible !== row.recommendation_eligible) eligibilityChanged.push(row.canonical_webtoon_id);
  }
  for (const old of existing) if (!ids.has(old.canonical_webtoon_id) && old.catalog_status !== 'retired') retired.push(old.canonical_webtoon_id);
  return { added, vectorsChanged, eligibilityChanged, retired };
}
