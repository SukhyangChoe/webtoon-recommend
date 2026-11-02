// Mirrors webtoon_is_public_safe for importer diagnostics and policy tests.
// Authoritative search/save/detail decisions are made in the DB, never on UI flags.
export const CATALOG_ACCESS_POLICY_VERSION = 'is-adult-only-v2-20261102';
export function isPublicCatalogWork(data) {
  return String(data?.metadata?.isAdult??'').trim().toLowerCase() !== 'true';
}
