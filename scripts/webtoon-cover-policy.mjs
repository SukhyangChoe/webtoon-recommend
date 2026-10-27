import path from 'node:path';

export const COVER_BUCKET = 'webtoon-covers';
export const COVER_PIPELINE = 'w640-q82-v1';

export function planCoverImport(index, catalog) {
  if (!Array.isArray(index.records) || !index.records.length) throw new Error('EMPTY_COVER_INDEX');
  const works = new Map(catalog.map(work => [work.canonicalWebtoonId, work]));
  const ids = new Set();
  const accepted = [], held = [];
  for (const record of index.records) {
    const id = record.canonicalWebtoonId;
    if (!/^wt_[a-z0-9_]+$/.test(id) || ids.has(id)) throw new Error('INVALID_OR_DUPLICATE_COVER_ID');
    ids.add(id);
    if (!/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.byteSize) || record.byteSize <= 0 || record.byteSize > 20_000_000) throw new Error(`INVALID_COVER_METADATA:${id}`);
    const relative = record.integratedRelativePath;
    if (typeof relative !== 'string' || !new RegExp(`^originals/${id}\\.(jpg|jpeg|png|webp)$`).test(relative)
      || path.posix.normalize(relative) !== relative) throw new Error(`UNSAFE_COVER_PATH:${id}`);
    const work = works.get(id);
    const reasons = [];
    if (!work) reasons.push('unknown_id');
    else {
      if (work.title !== record.title) reasons.push('title_mismatch');
      if (work.platform !== record.platformStored) reasons.push('platform_mismatch');
    }
    if (reasons.length) held.push({ id, title: record.title, dbTitle: work?.title ?? null, platform: record.platformStored, dbPlatform: work?.platform ?? null, reasons });
    else accepted.push(record);
  }
  return {
    accepted, held,
    eligibleWithoutCover: catalog.filter(work => work.recommendationEligible && !ids.has(work.canonicalWebtoonId)).map(work => ({ id: work.canonicalWebtoonId, title: work.title })),
  };
}

export function coverObjectPath(id, hash, width) {
  if (!/^wt_[a-z0-9_]+$/.test(id) || !/^[a-f0-9]{64}$/.test(hash) || ![320, 640].includes(width)) throw new Error('INVALID_COVER_OBJECT');
  return `v1/${id}/${hash}-w${width}-q82-v1.webp`;
}

// A publication request is not evidence of a license: retain source flags verbatim.
export function coverProvenance(record, archiveName, originalArchiveSha256, variants) {
  return {
    archive: archiveName, archiveSha256: originalArchiveSha256,
    originalSha256: record.sha256, originalBytes: record.byteSize,
    sourcePageUrl: record.sourcePageUrl ?? null, sourceImageUrl: record.sourceImageUrl ?? null,
    rightsState: record.rightsState ?? null, publicationReady: record.publicationReady ?? null,
    publicationRequestedByUser: true, pipeline: COVER_PIPELINE, variants,
  };
}
