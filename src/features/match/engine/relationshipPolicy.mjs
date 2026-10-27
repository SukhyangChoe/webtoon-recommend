import { PERSONA_GENRE_KEYS } from "../config/personaImages.mjs";

export const RELATIONSHIP_MIN_SCORE = 80;
export const RELATIONSHIP_MAX_PEOPLE = 6;
export const RELATIONSHIP_PAGE_SIZE = 6;

// Follow the owner's current result order; never fill gaps with unrelated genres.
export function relationshipGenreKeys(displayGenres = []) {
  return [...new Set(displayGenres.map((genre) => genre.genreKey).filter((key) => PERSONA_GENRE_KEYS.includes(key)))].slice(0, 3);
}

// Receive already-ranked entries: keep dense ranks and the stable tie order intact.
export function selectRelationshipPage(entries, { page = 1, genreKey = "all" } = {}) {
  const visible = entries.filter((entry) => !entry.hiddenByOwner);
  const filtered = genreKey === "all" ? visible : visible.filter((entry) => entry.genreKey === genreKey);
  const totalPages = Math.max(1, Math.ceil(filtered.length / RELATIONSHIP_PAGE_SIZE));
  const requested = Number(page);
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 1));
  const offset = (currentPage - 1) * RELATIONSHIP_PAGE_SIZE;
  return {
    graphEntries: filtered.filter((entry) => Number.isFinite(entry.score) && entry.score >= RELATIONSHIP_MIN_SCORE).slice(0, RELATIONSHIP_MAX_PEOPLE),
    entries: filtered.slice(offset, offset + RELATIONSHIP_PAGE_SIZE),
    pagination: { page: currentPage, pageSize: RELATIONSHIP_PAGE_SIZE, totalItems: filtered.length, totalPages },
  };
}
