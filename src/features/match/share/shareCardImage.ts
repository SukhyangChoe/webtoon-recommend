import { MATCH_UI_THEME as theme } from '../config/uiTheme.mjs';
import { SHARE_RANKING_OWNER, shareRankingNodes } from './shareRankingLayout.mjs';
import { safeWorkCoverUrl } from '../config/recommendationPresentation.mjs';
import { personalShareLayout, shareStarCount } from './sharePersonalLayout.mjs';
import { BRAND_LOGO, brandLogoContents } from '@/components/layout/brandIdentity.mjs';

type Portrait = { nickname: string; imageSrc: string | null };
type BaseCard = { eyebrow: string; title: string; footer: string; fileName: string; owner: Portrait };
export type ShareCardModel = BaseCard & (
  { type: 'personal'; genres: Array<{ label: string; stars: number }>; recommendations: Array<{ title: string; coverUrl: string | null }> } |
  { type: 'pair'; partner: Portrait; score: number; badge: string; bandLabel?: string | null; sharedGenres: string[] } |
  { type: 'ranking'; entryCount: number; participants: Array<Portrait & { rank: number; score: number }> }
);
export const SHARE_CARD_SIZE = { width: 350, height: 500 };
export function shareCardSize(model: ShareCardModel) {
  return { ...SHARE_CARD_SIZE, height: model.type === 'personal' ? personalShareLayout(model.genres, model.recommendations.length > 0).cardHeight : SHARE_CARD_SIZE.height };
}
// Every star uses the same local geometry; only its position changes, never its scale.
const SHARE_STAR_SIZE = 11;
const SHARE_STAR_PATH = 'M5.5 0l1.65 3.52 3.85 .44-2.86 2.64 .77 3.85-3.41-1.87-3.41 1.87 .77-3.85-2.86-2.64 3.85-.44Z';
const resourceCache = new Map<string, Promise<string>>();
async function dataUrl(src: string) {
  let task = resourceCache.get(src);
  if (!task) {
    task = fetch(src, { signal: AbortSignal.timeout(8000) }).then(async response => {
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
  const size = shareCardSize(model);
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
  const covers = new Map<string, string>();
  if (model.type === 'personal') await Promise.all([...new Set(model.recommendations.map(item => safeWorkCoverUrl(item.coverUrl)))].map(async src => {
    if (!src) return;
    try { covers.set(src, await dataUrl(src)); } catch { /* Keep the title with a cover placeholder if CORS or the network prevents embedding. */ }
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
  function portrait(person: Portrait, x: number, y: number, width: number, height: number, clip = '', alignment: 'xMidYMin meet' | 'xMidYMax meet' = 'xMidYMin meet') {
    const image = person.imageSrc && images.get(person.imageSrc);
    return image ? `<image data-portrait="true" href="${image}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${alignment}" ${clip ? `clip-path="url(#${clip})"` : ''}/>` : `<g>${rect(x, y, width, height, Math.min(width, height) / 2, theme.soft)}${text(Array.from(person.nickname)[0] || '독', x + width / 2, y + height / 2 + 7, 22, theme.accentInk, 'middle')}</g>`;
  }
  function avatar(person: Portrait, cx: number, cy: number, radius: number, id: string) {
    return `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${radius}" fill="${theme.soft}" stroke="#a9dfeb"/>${portrait(person, cx - radius, cy - radius + 2, radius * 2, radius * 2.67, id)}`;
  }
  const star = (x: number, y: number) => `<path data-star="true" fill="#F4B82E" transform="translate(${x} ${y})" d="${SHARE_STAR_PATH}"/>`;
  let body = '';
  if (model.type === 'personal') {
    const layout = personalShareLayout(model.genres, model.recommendations.length > 0);
    // An inset, contained image keeps every portrait's hair, shoulders and hands inside the card.
    body += '<g data-personal-portrait="true" mask="url(#personalPortraitFade)">' + portrait(model.owner, 112, 66, 220, 269) + '</g>';
    body += '<g data-personal-eyebrow="true">' + block(model.eyebrow, 18, 32, 314, 15, 20, 2, theme.accentInk) + '</g>';
    const titleLines = lines(model.title, 166, 28);
    body += block(model.title, 18, 321 - (Math.min(titleLines.length, 3) - 1) * 34, 166, 28, 34, 3);
    const width = (314 - 16) / 3;
    model.genres.forEach((genre, index) => {
      const x = 18 + index * (width + 8);
      body += `<g data-personal-genre="${index}">` + rect(x, layout.genreY, width, layout.genreHeight, 12, index === 0 ? theme.soft : '#fff');
      body += text(`${index + 1}위`, x + 10, 361, 12, theme.muted);
      body += block(genre.label, x + 10, 384, width - 20, 16, 18, 2);
      const count = shareStarCount(genre.stars);
      for (let i = 0; i < count; i++) body += star(x + 10 + (i % 5) * (SHARE_STAR_SIZE + 2), 407 + Math.floor(i / 5) * 12);
      body += '</g>';
    });
    if (!model.genres.length) body += text('아직 선택한 장르가 없어요', 175, 398, 14, theme.muted, 'middle');
    if (model.recommendations.length) {
      body += '<g data-personal-recommendations="true">' + divider(layout.recommendationDividerY) + text('내가 추천하는 작품', 18, layout.recommendationDividerY + 22, 13, theme.accentInk);
      const columns = model.recommendations.length;
      const tileWidth = (314 - (columns - 1) * 10) / columns;
      model.recommendations.forEach((item, index) => {
        const x = 18 + index * (tileWidth + 10), center = x + tileWidth / 2;
        const image = item.coverUrl && covers.get(item.coverUrl);
        body += `<g data-recommendation="${index}"><title>${xml(item.title)}</title>`;
        const coverX = center - layout.coverWidth / 2;
        body += rect(coverX, layout.coverY, layout.coverWidth, layout.coverHeight, 5, theme.soft);
        body += image ? `<defs><clipPath id="cover${index}"><rect x="${coverX}" y="${layout.coverY}" width="${layout.coverWidth}" height="${layout.coverHeight}" rx="5"/></clipPath></defs><image data-work-cover="true" href="${image}" x="${coverX}" y="${layout.coverY}" width="${layout.coverWidth}" height="${layout.coverHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover${index})"/>` : text('표지 준비 중', center, layout.coverY + layout.coverHeight / 2 + 4, 9, theme.muted, 'middle');
        const wrapped = lines(item.title, tileWidth - 6, 11), visible = wrapped.slice(0, 2);
        if (wrapped.length > 2) {
          let last = visible[1];
          while (last && context.measureText(last + '…').width > tileWidth - 6) last = Array.from(last).slice(0, -1).join('');
          visible[1] = last + '…';
        }
        body += '<g data-recommendation-title="true">' + visible.map((line, lineIndex) => text(line, center, layout.recommendationTitleY + lineIndex * 14, 11, theme.ink, 'middle')).join('') + '</g></g>';
      });
      body += '</g>';
    }
  } else if (model.type === 'pair') {
    body += '<g data-pair-backgrounds="true"><path data-pair-side="owner" d="M0 0H198L161 293H0Z" fill="url(#pairOwnerBackground)"/><path data-pair-side="partner" d="M198 0H350V293H161Z" fill="url(#pairPartnerBackground)"/><path d="M198 0H350V293H161Z" fill="url(#pairDots)" opacity=".6"/></g>';
    body += portrait(model.owner, 4, 49, 172, 244, 'heroClip', 'xMidYMax meet');
    body += portrait(model.partner, 174, 49, 172, 244, 'heroClip', 'xMidYMax meet');
    body += '<path d="M198 0L161 293" stroke="#8db6c5" stroke-width="1.5"/>';
    body += '<g data-pair-nickname="owner">' + block(model.owner.nickname, 87.5, 25, 147, 13, 17, 2, theme.accentInk, 'middle', true) + '</g>';
    body += '<g data-pair-nickname="partner">' + block(model.partner.nickname, 262.5, 25, 147, 13, 17, 2, theme.accentInk, 'middle', true) + '</g>';
    body += '<g data-pair-result="true">' + rect(0, 293, 350, 117, 0, '#fff', '#fff');
    body += '<path d="M0 293H350" stroke="' + theme.border + '"/>';
    body += '<g data-pair-result-label="true">' + text('웹툰 취향 궁합', 18, 316, 13, theme.accentInk) + '</g>';
    const titleRows = Math.min(2, lines(model.title, 224, 22).length), titleY = titleRows > 1 ? 347 : 360;
    body += '<g data-pair-result-name="true">' + block(model.title, 18, titleY, 224, 22, 26, 2) + '</g>';
    const band = model.bandLabel || model.badge, bandY = titleY + (titleRows - 1) * 26 + 22;
    context.font = `700 11px "${family}"`;
    const bandWidth = Math.min(224, context.measureText(band).width + 16);
    body += '<g data-pair-result-band="true">' + rect(18, bandY - 13, bandWidth, 20, 6, '#edf7fb', '#edf7fb') + block(band, 26, bandY, bandWidth - 16, 11, 14, 1, theme.muted) + '</g>';
    const score = Math.max(0, Math.min(100, model.score)), circumference = 2 * Math.PI * 36;
    body += '<g data-pair-score="true"><circle cx="294" cy="366" r="36" fill="#f7fdff" stroke="#e6f0f4" stroke-width="4"/>';
    if (score > 0) body += `<circle data-pair-score-arc="true" cx="294" cy="366" r="36" fill="none" stroke="url(#pairScoreAccent)" stroke-width="4" stroke-dasharray="${circumference * score / 100} ${circumference}" transform="rotate(-90 294 366)"/>`;
    context.font = `700 16px "${family}"`;
    const percentWidth = context.measureText('%').width;
    let scoreSize = 36, scoreWidth = 0;
    do { context.font = `700 ${scoreSize}px "${family}"`; scoreWidth = context.measureText(String(model.score)).width; if (scoreWidth + percentWidth <= 60) break; scoreSize--; } while (scoreSize > 27);
    const scoreX = 294 - (scoreWidth + percentWidth) / 2;
    body += text(model.score, scoreX, 378, scoreSize, theme.ink) + text('%', scoreX + scoreWidth, 378, 16, theme.ink) + '</g></g>';
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
  const footerY = model.type === 'personal' ? personalShareLayout(model.genres, model.recommendations.length > 0).footerY : model.type === 'pair' ? 470 : 466;
  body += divider(footerY) + `<svg data-share-brand="true" x="141" y="${size.height - 25}" width="68" height="20" viewBox="${BRAND_LOGO.viewBox}" aria-label="웹툰핏">${brandLogoContents(family)}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${size.height}" viewBox="0 0 350 ${size.height}"><defs>
    <style>${font ? `@font-face{font-family:'WebtoonFit Share';src:url('${font}') format('truetype');font-weight:700;}` : ''}text{font-family:'${family}',sans-serif;font-weight:700}</style>
    <linearGradient id="background" x2="0" y2="1"><stop stop-color="#e3f8fc"/><stop offset=".7" stop-color="#fff"/></linearGradient>
    <linearGradient id="pairOwnerBackground" x2="0" y2="1"><stop stop-color="${theme.soft}"/><stop offset="1" stop-color="#c9f1f8"/></linearGradient>
    <linearGradient id="pairPartnerBackground" x2="0" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="${theme.warm}"/></linearGradient>
    <pattern id="pairDots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".6" fill="#b8deea"/></pattern>
    <linearGradient id="pairScoreAccent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b1f2fc"/><stop offset=".5" stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accentInk}"/></linearGradient>
    <linearGradient id="portraitOpacity" x1="0" y1="66" x2="0" y2="335" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff"/><stop offset=".8" stop-color="#fff" stop-opacity=".75"/><stop offset=".93" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="personalPortraitFade" x="112" y="66" width="220" height="269" maskUnits="userSpaceOnUse"><rect x="112" y="66" width="220" height="269" fill="url(#portraitOpacity)"/></mask>
    <clipPath id="card"><rect x=".5" y=".5" width="349" height="${size.height - 1}" rx="20"/></clipPath>
    <clipPath id="heroClip"><rect x="0" y="47" width="350" height="246"/></clipPath>
  </defs><g clip-path="url(#card)"><rect width="350" height="${size.height}" fill="url(#background)"/>${body}</g><rect x=".5" y=".5" width="349" height="${size.height - 1}" rx="20" fill="none" stroke="${theme.border}"/></svg>`;
}

/** Rasterize the exact preview, never redraw a separate export layout. */
export async function renderShareCardPng(svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = Math.round(1080 * image.naturalHeight / image.naturalWidth);
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
