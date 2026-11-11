import catalog from '../data/readerComicCatalog.v1.json' with { type: 'json' };

/** Match the actual episode as well as its key, including explanations saved before this release. */
export function withReaderComic(explanation) {
  if (!explanation) return explanation;
  const entry = catalog[explanation.sceneKey] ?? (explanation.genreKey === 'other' ? catalog['other.fallback'] : undefined);
  const copy = { ...explanation };
  delete copy.comic;
  if (!entry || entry.sourceScene !== explanation.scene) return copy;
  return { ...copy, comic: { src: entry.src, width: entry.width, height: entry.height, alt: entry.sourceScene, panels: entry.panels } };
}
