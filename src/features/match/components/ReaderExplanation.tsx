'use client';

import { useState } from 'react';

export type ReaderExplanationModel = {
  version: string;
  genreKey: string;
  sceneKey: string;
  headline: string;
  introduction: string;
  boundary: string | null;
  scene: string;
  recommendationNote: string | null;
  basis: string[];
  disclaimer: string;
  comic?: { src: string; width: number; height: number; alt: string; panels: string[] };
};

/** Receives only public editorial copy; the scene bank and private vectors stay on the server. */
export function ReaderExplanation({ explanation }: { explanation?: ReaderExplanationModel }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!explanation?.headline || !explanation.scene) return null;
  const comic = explanation.comic;
  const showComic = comic && comic.src !== failedSource;
  return <section className="wm-panel wm-reader-explanation wm-insight-card wm-story-card" aria-labelledby="wm-reader-heading" data-scene-key={explanation.sceneKey}>
    <header><p className="wm-reader-eyebrow wm-story-eyebrow">내 취향 사용설명서</p><h2 id="wm-reader-heading" className="wm-story-title">{explanation.headline}</h2></header>
    <p className="wm-reader-introduction wm-story-copy">{explanation.introduction}</p>
    <div className="wm-reader-scene wm-story-scene">
      <h3 className="wm-story-subtitle">일상 속에서는</h3>
      <p className="wm-story-copy">{explanation.scene}</p>
    </div>
    {showComic && <>
      {/* eslint-disable-next-line @next/next/no-img-element -- Pre-rendered, compressed WebP is served without an image-generation request. */}
      <img className="wm-reader-comic" src={comic.src} width={comic.width} height={comic.height} alt={comic.alt} loading="lazy" decoding="async" onError={() => setFailedSource(comic.src)} />
    </>}
  </section>;
}
