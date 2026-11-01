import { personaImageFor, PERSONA_GENRE_KEYS } from '../config/personaImages.mjs';
import { pairArchetypeFor, personalArchetypeFor } from './shareArchetypes.mjs';
import { safeWorkCoverUrl } from '../config/recommendationPresentation.mjs';

export const SHARE_PAGE_TITLES = Object.freeze({ personal: '내 취향, 한 장으로.', pair: '우리 취향, 한 장으로.', ranking: '취향 메이트를 찾습니다.' });
function portrait(nickname, genreKey) {
  return { nickname: nickname || '이름 없는 독자', imageSrc: PERSONA_GENRE_KEYS.includes(genreKey) ? personaImageFor(genreKey).src : null };
}
export function createPersonalShareCard(result, recommendations = []) {
  const genres = (result.topGenres ?? []).filter(genre => genre.stars > 0).slice(0, 3);
  const picks = recommendations.filter(item => typeof item?.title === 'string' && item.title.trim()).slice(0, 3).map(item => ({ title: item.title.trim(), coverUrl: safeWorkCoverUrl(item.coverUrl) }));
  return { type: 'personal', eyebrow: result.nickname ? `${result.nickname}님의 웹툰 취향` : '나의 웹툰 취향', title: personalArchetypeFor(genres[0]?.genreKey).name, owner: portrait(result.nickname, genres[0]?.genreKey), genres: genres.map(genre => ({ label: genre.displayLabel, stars: genre.stars })), recommendations: picks, footer: '', fileName: 'webtoon-match-personal.png' };
}
export function createPairShareCard(result) {
  const archetype = pairArchetypeFor(result.score);
  return { type: 'pair', eyebrow: `${result.ownerNickname} × ${result.challengerNickname}`, title: archetype.name, badge: archetype.badge, bandLabel: result.band?.label || null, score: result.score, owner: portrait(result.ownerNickname, result.ownerGenreKey), partner: portrait(result.challengerNickname, result.challengerGenreKey), sharedGenres: (result.sharedGenres ?? []).slice(0, 3), footer: '', fileName: 'webtoon-match-pair.png' };
}
export function createRankingShareCard(result) {
  return { type: 'ranking', eyebrow: `${result.ownerNickname}님의 취향 관계도`, title: '취향 메이트를 찾습니다.', owner: portrait(result.ownerNickname, result.ownerGenreKey), entryCount: result.entryCount, participants: (result.top20 ?? []).slice(0, 3).map(entry => ({ ...portrait(entry.nickname, entry.genreKey), rank: entry.rank, score: entry.score })), footer: '', fileName: 'webtoon-match-ranking.png' };
}
export function shareCardDescription(card) {
  if (card.type === 'personal') return `${card.eyebrow}. ${card.title}. ${card.genres.map((genre, index) => `${index + 1}위 ${genre.label}, 별 ${genre.stars}개`).join('. ')}${card.recommendations?.length ? `. 추천작: ${card.recommendations.map(item => item.title).join(', ')}` : ''}`;
  if (card.type === 'pair') return `${card.eyebrow}. 웹툰 취향 궁합: ${card.title}, ${card.score}%. 함께 달릴 장르: ${card.sharedGenres.join(', ') || '서로의 새 장르 탐색'}`;
  return `${card.eyebrow}. ${card.entryCount}명 참여. ${card.participants.map(entry => `${entry.rank}위 ${entry.nickname}, ${entry.score}%`).join('. ') || '첫 번째 취향 메이트를 기다리는 중'}`;
}
