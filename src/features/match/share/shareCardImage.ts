import { MATCH_UI_THEME as theme } from '../config/uiTheme.mjs';
import { SHARE_RANKING_OWNER, shareRankingNodes } from './shareRankingLayout.mjs';

type Portrait = { nickname: string; imageSrc: string | null };
type BaseCard = { eyebrow: string; title: string; footer: string; fileName: string; owner: Portrait };
export type ShareCardModel = BaseCard & (
  { type: 'personal'; genres: Array<{ label: string; stars: number }> } |
  { type: 'pair'; partner: Portrait; score: number; badge: string; sharedGenres: string[] } |
  { type: 'ranking'; entryCount: number; participants: Array<Portrait & { rank: number; score: number }> }
);
export const SHARE_CARD_SIZE = { width: 350, height: 500 };
// Every star uses the same local geometry; only its position changes, never its scale.
const SHARE_STAR_SIZE = 11;
const SHARE_STAR_PATH = 'M5.5 0l1.65 3.52 3.85 .44-2.86 2.64 .77 3.85-3.41-1.87-3.41 1.87 .77-3.85-2.86-2.64 3.85-.44Z';
const resourceCache = new Map<string, Promise<string>>();
async function dataUrl(src: string) {
  let task = resourceCache.get(src);
  if (!task) {
    task = fetch(src).then(async response => {
      if (!response.ok) throw new Error('SHARE_CARD_ASSET_UNAVAILABLE');
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('SHARE_CARD_ASSET_UNAVAILABLE'));
        reader.readAsDataURL(blob);
      });
    }).catch(error => { resourceCache.delete(src); throw error; });
    resourceCache.set(src, task);
  }
  return task;
}
const xml = (value: string | number) => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]!));

/** Build one self-contained card, shared by the preview and PNG export. */
export async function renderShareCardSvg(model: ShareCardModel) {
  let font = '';
  try {
    font = await dataUrl('/match/fonts/NanumGothic-Bold.ttf');
    const face = new FontFace('WebtoonFit Share', `url(${font})`, { weight: '700' });
    await face.load(); document.fonts.add(face);
  } catch { font = ''; /* A readable system font remains available offline. */ }
  const family = font ? 'WebtoonFit Share' : 'sans-serif';
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('SHARE_CARD_CANVAS_UNAVAILABLE');
  const sources = [model.owner.imageSrc, ...(model.type === 'pair' ? [model.partner.imageSrc] : model.type === 'ranking' ? model.participants.map(entry => entry.imageSrc) : [])];
  const images = new Map<string, string>();
  await Promise.all([...new Set(sources)].map(async src => {
    if (!src || !/^\/match\/personas\/original-v1\/[a-z_]+\.png$/.test(src)) return;
    try { images.set(src, await dataUrl(src)); } catch { /* Use a neutral initial, not a broken image. */ }
  }));
  function lines(value: string, width: number, size: number) {
    context!.font = `700 ${size}px "${family}"`;
    const result: string[] = [];
    for (const paragraph of value.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (line && context!.measureText(`${line} ${word}`).width > width) { result.push(line); line = ''; }
        if (context!.measureText(word).width <= width) { line = line ? `${line} ${word}` : word; continue; }
        for (const character of Array.from(word)) {
          if (line && context!.measureText(line + character).width > width) { result.push(line); line = ''; }
          line += character;
        }
      }
      result.push(line);
    }
    return result;
  }
  function text(value: string | number, x: number, y: number, size = 14, color: string = theme.ink, anchor = 'start') {
    return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${xml(value)}</text>`;
  }
  function block(value: string, x: number, y: number, width: number, size: number, leading: number, maxLines: number, color: string = theme.ink, anchor = 'start', verticallyCentered = false) {
    let wrapped = lines(value, width, size);
    while (wrapped.length > maxLines && size > 9) { size -= .5; wrapped = lines(value, width, size); }
    if (verticallyCentered) {
      // Center the visible glyphs, including both lines when a nickname wraps.
      const first = context!.measureText(wrapped[0]);
      const last = context!.measureText(wrapped[wrapped.length - 1]);
      y += (first.actualBoundingBoxAscent - last.actualBoundingBoxDescent - (wrapped.length - 1) * leading) / 2;
    }
    return wrapped.map((line, index) => text(line, x, y + index * leading, size, color, anchor)).join('');
  }
  const rect = (x: number, y: number, width: number, height: number, radius = 12, fill: string = '#fff', stroke: string = theme.border) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
  const divider = (y: number) => `<path d="M18 ${y}H332" stroke="${theme.border}"/>`;
  function portrait(person: Portrait, x: number, y: number, width: number, height: number, clip = '') {
    const image = person.imageSrc && images.get(person.imageSrc);
    return image ? `<image href="${image}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMin meet" ${clip ? `clip-path="url(#${clip})"` : ''}/>` : `<g>${rect(x, y, width, height, Math.min(width, height) / 2, theme.soft)}${text(Array.from(person.nickname)[0] || '독', x + width / 2, y + height / 2 + 7, 22, theme.accentInk, 'middle')}</g>`;
  }
  function avatar(person: Portrait, cx: number, cy: number, radius: number, id: string) {
    return `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${radius}" fill="${theme.soft}" stroke="#a9dfeb"/>${portrait(person, cx - radius, cy - radius + 2, radius * 2, radius * 2.67, id)}`;
  }
  const star = (x: number, y: number) => `<path data-star="true" fill="#F4B82E" transform="translate(${x} ${y})" d="${SHARE_STAR_PATH}"/>`;
  let body = '';
  if (model.type === 'personal') {
    body += portrait(model.owner, 90, 62, 260, 273);
    body += '<rect x="0" y="228" width="350" height="110" fill="url(#fade)"/>';
    body += block(model.eyebrow, 18, 32, 314, 13, 17, 2, theme.accentInk);
    const titleLines = lines(model.title, 166, 28);
    body += block(model.title, 18, 321 - (Math.min(titleLines.length, 3) - 1) * 34, 166, 28, 34, 3);
    const width = (314 - 16) / 3;
    model.genres.forEach((genre, index) => {
      const x = 18 + index * (width + 8);
      body += rect(x, 342, width, 116, 12, index === 0 ? theme.soft : '#fff');
      body += text(`${index + 1}위`, x + 10, 361, 12, theme.muted);
      body += block(genre.label, x + 10, 384, width - 20, 16, 18, 2);
      const count = Math.max(0, Math.min(18, Math.floor(genre.stars)));
      for (let i = 0; i < count; i++) body += star(x + 10 + (i % 5) * (SHARE_STAR_SIZE + 2), 407 + Math.floor(i / 5) * 12);
    });
    if (!model.genres.length) body += text('아직 선택한 장르가 없어요', 175, 398, 14, theme.muted, 'middle');
  } else if (model.type === 'pair') {
    body += portrait(model.owner, -10, 49, 190, 244, 'heroClip');
    body += portrait(model.partner, 170, 49, 190, 244, 'heroClip');
    body += '<path d="M192 49L161 293" stroke="#fff" stroke-width="2"/>';
    body += block(model.eyebrow, 18, 30, 314, 13, 17, 2, theme.accentInk);
    body += text('웹툰 취향 궁합', 18, 319, 12, theme.muted);
    body += text(String(model.score), 18, 380, 58, theme.accentInk);
    context.font = `700 58px "${family}"`;
    body += text('%', 18 + context.measureText(String(model.score)).width + 2, 380, 25);
    body += '<path d="M156 336V392" stroke="#dcebef"/>';
    body += block(model.title, 171, 345, 161, 22, 27, 2);
    body += block(model.badge, 171, 395, 161, 11, 14, 1, theme.accentInk);
    body += divider(410) + text('함께 달릴 장르', 18, 429, 12, theme.muted);
    if (model.sharedGenres.length) {
      let left = 18;
      context.font = `700 13px "${family}"`;
      const widths = model.sharedGenres.map(label => context.measureText(label).width + 18);
      const ratio = Math.min(1, (314 - (widths.length - 1) * 6) / widths.reduce((sum, width) => sum + width, 0));
      model.sharedGenres.forEach((label, index) => {
        const width = widths[index] * ratio;
        body += rect(left, 438, width, 24, 8, theme.soft, theme.soft) + block(label, left + width / 2, 455, width - 12, 13, 15, 1, theme.accentInk, 'middle');
        left += width + 6;
      });
    } else body += text('서로의 새 장르 탐색', 18, 454, 14, theme.accentInk);
  } else {
    body += block(model.eyebrow, 18, 30, 255, 13, 17, 2, theme.accentInk);
    body += text(`${model.entryCount}명 참여`, 332, 30, 10, theme.muted, 'end');
    const entries = model.participants;
    const nodes: Array<{ x: number; y: number; radius: number }> = shareRankingNodes(entries);
    const owner = SHARE_RANKING_OWNER;
    nodes.forEach(node => { body += `<path d="M${owner.x} ${owner.y}L${node.x} ${node.y}" stroke="#9cdeeb" fill="none"/>`; });
    body += avatar(model.owner, owner.x, owner.y, owner.radius, 'owner');
    body += '<g data-owner-label="true">' + rect(112, 130, 126, 26, 12, theme.soft);
    body += block(model.owner.nickname, 175, 143, 116, 11, 13, 2, theme.ink, 'middle', true) + '</g>';
    entries.forEach((entry, index) => {
      const node = nodes[index];
      body += `<g data-ranking-node="${index}">` + avatar(entry, node.x, node.y, node.radius, `person${index}`);
      body += '<g data-ranking-score="true">' + rect(node.x - 24, node.y + 14, 48, 22, 11, theme.soft, '#a9dfeb');
      body += block(`${entry.score}%`, node.x, node.y + 25, 42, 13, 15, 1, theme.accentInk, 'middle', true) + '</g>';
      const labelGap = Math.abs(node.x - owner.x) > 1 ? 53 : 49;
      body += block(entry.nickname, node.x, node.y + labelGap, 98, 12, 13, 2, theme.ink, 'middle') + '</g>';
    });
    body += divider(305);
    body += text(entries.length ? '현재 가장 잘 맞는 취향' : '첫 번째 취향 메이트를 기다리는 중', 18, 328, 12, theme.muted);
    entries.forEach((entry, index) => {
      const y = 342 + index * 40;
      body += rect(18, y, 314, 38, 7, index === 0 ? theme.soft : '#fff', index === 0 ? theme.border : '#fff');
      body += text(`${entry.rank}위`, 28, y + 25, 14, index === 0 ? theme.accentInk : theme.muted);
      body += avatar(entry, 86, y + 20, 15, `row${index}`);
      body += block(entry.nickname, 111, y + (lines(entry.nickname, 150, 14).length > 1 ? 16 : 25), 150, 14, 14, 2);
      body += text(`${entry.score}%`, 320, y + 25, 18, theme.accentInk, 'end');
    });
    if (!entries.length) body += text('나와 웹툰 취향이 통하는 친구를 초대해요', 175, 382, 13, theme.muted, 'middle');
  }
  const footerY = model.type === 'pair' ? 470 : 466;
  body += divider(footerY) + block(model.footer, 175, footerY + 22, 314, 12, 15, 1, theme.muted, 'middle');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="500" viewBox="0 0 350 500"><defs>
    <style>${font ? `@font-face{font-family:'WebtoonFit Share';src:url('${font}') format('truetype');font-weight:700;}` : ''}text{font-family:'${family}',sans-serif;font-weight:700}</style>
    <linearGradient id="background" x2="0" y2="1"><stop stop-color="#e3f8fc"/><stop offset=".7" stop-color="#fff"/></linearGradient>
    <linearGradient id="fade" x2="0" y2="1"><stop stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <clipPath id="card"><rect x=".5" y=".5" width="349" height="499" rx="20"/></clipPath>
    <clipPath id="heroClip"><rect x="0" y="47" width="350" height="246"/></clipPath>
  </defs><g clip-path="url(#card)"><rect width="350" height="500" fill="url(#background)"/>${body}</g><rect x=".5" y=".5" width="349" height="499" rx="20" fill="none" stroke="${theme.border}"/></svg>`;
}

/** Rasterize the exact preview, never redraw a separate export layout. */
export async function renderShareCardPng(svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = Math.round(1080 * SHARE_CARD_SIZE.height / SHARE_CARD_SIZE.width);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('SHARE_CARD_CANVAS_UNAVAILABLE');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('SHARE_CARD_RENDER_FAILED')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
export function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl; link.download = fileName;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
