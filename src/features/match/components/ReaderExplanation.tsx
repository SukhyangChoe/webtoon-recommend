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
};

/** Receives only public editorial copy; the scene bank and private vectors stay on the server. */
export function ReaderExplanation({ explanation }: { explanation?: ReaderExplanationModel }) {
  if (!explanation?.headline || !explanation.scene) return null;
  return <section className="wm-panel wm-reader-explanation wm-insight-card wm-story-card" aria-labelledby="wm-reader-heading" data-scene-key={explanation.sceneKey}>
    <header><p className="wm-reader-eyebrow wm-story-eyebrow">내 취향 사용설명서</p><h2 id="wm-reader-heading" className="wm-story-title">{explanation.headline}</h2></header>
    <p className="wm-reader-introduction wm-story-copy">{explanation.introduction}</p>
    <div className="wm-reader-scene wm-story-scene"><h3 className="wm-story-subtitle">일상 속에서는</h3><p className="wm-story-copy">{explanation.scene}</p></div>
  </section>;
}
