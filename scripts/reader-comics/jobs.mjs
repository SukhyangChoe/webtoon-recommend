import { READER_SCENES } from '../../src/features/match/config/readerSceneCopy.mjs';
import { COMIC_DIALOGUE } from './storyboards.mjs';

const commonScene = '다음 이야기를 고르다 친구와 눈이 마주치면, 서로 다른 표지를 가리키고 웃을 것 같아요. 취향 이야기를 한 편 더 만들어가는 캐릭터예요.';
const revisedAssets = { 'murim.growth': 'murim-growth-v2.webp' };
export const COMIC_JOBS = Object.entries({ ...READER_SCENES, other: { fallback: commonScene } }).flatMap(([genre, scenes]) =>
  Object.entries(scenes).map(([type, sourceScene]) => {
    const panels = COMIC_DIALOGUE[genre]?.[type];
    if (panels?.length !== 4) throw Error(`Missing four-panel storyboard: ${genre}.${type}`);
    return { key: `${genre}.${type}`, genre, type, sourceScene, panels, src: `/match/reader-comics/v1/${revisedAssets[`${genre}.${type}`] ?? `${genre}-${type}.webp`}` };
  }));

export function comicPrompt(job) {
  return `Use case: illustration-story. Create ONE finished original Korean FOUR-PANEL everyday diary comic for WebtoonFit. Square canvas, 2 by 2 equally sized panels, reading order top left, top right, bottom left, bottom right. Thin slightly imperfect BLACK hand-drawn rectangular frames, narrow white gutters, WHITE background. NO page title, footer, logo or explanatory text outside the panels. Output only the four-panel comic.
REFERENCE IMAGE is the approved CHARACTER AND STYLE reference, not an edit target. Precisely keep its original little white rounded bean creature: two short curved black hair tufts, dot eyes, tiny w mouth, very short round limbs, tiny pale peach cheek blush. Friends can have a different tiny tuft to distinguish them. Redraw coherent new poses and expressions for this episode. Extremely simple sparse black pen line art with very slight hand-drawn texture, lots of white space, very few scene props, low detail. Only white, black and tiny peach cheek blush. No color fills, gradients, blue backgrounds, anime characters, hair detail, human clothes, shadows, 3D rendering, complex UI or polished vector infographic look. Match the charming minimal Korean diary cartoon style of the reference.
Actual source of THIS episode: ${job.sourceScene}
Turn exactly this situation into a funny specific four-beat everyday story, with setup, development, turn and a small warm deadpan payoff. Draw the real actions and relevant simple props from the source, not a person reading or reacting to a webtoon. Keep the main character consistent in all four panels, vary close and wider framing, make every panel visually distinct. When a line describes an action, show that action and use the words as a short loose handwritten caption. When it is dialogue, place it by the speaker in a simple speech bubble. Use only the supplied Korean lines, no invented additional text. Accurate readable Korean handwriting, generously spaced, roughly 1 to 2 short lines per panel. Do not print panel numbers or the episode identifier.
Panel 1 text exactly: ${JSON.stringify(job.panels[0])}
Panel 2 text exactly: ${JSON.stringify(job.panels[1])}
Panel 3 text exactly: ${JSON.stringify(job.panels[2])}
Panel 4 text exactly: ${JSON.stringify(job.panels[3])}
Render correct hands and simple legible expressions. No copying the reference episode's travel/booking story unless that is this episode's actual source. All four panels must belong to the specific source above. The final image should feel like another episode by the same cartoonist using the same character.`;
}

if (process.argv[1]?.endsWith('/jobs.mjs')) {
  const selected = COMIC_JOBS.find(job => job.key === process.argv[2]);
  if (process.argv[2] && !selected) throw Error('Unknown episode');
  console.log(selected ? comicPrompt(selected) : JSON.stringify(COMIC_JOBS.map(job => ({ ...job, prompt: comicPrompt(job) }))));
}
