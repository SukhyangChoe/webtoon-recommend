/** Shared geometry keeps the SVG preview and its exported dimensions in sync. */
export function shareStarCount(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(18, Math.floor(value))) : 0;
}

export function personalShareLayout(genres, hasRecommendations) {
  const starRows = Math.max(1, ...genres.map(genre => Math.ceil(shareStarCount(genre.stars) / 5)));
  const genreY = 342;
  const genreHeight = 73 + starRows * 12;
  const recommendationDividerY = genreY + genreHeight + 18;
  const coverY = recommendationDividerY + 34;
  const coverHeight = 112;
  const recommendationTitleY = coverY + coverHeight + 17;
  const footerY = hasRecommendations ? recommendationTitleY + 14 + 19 : genreY + genreHeight + 18;
  return {
    genreY, genreHeight, starRows, recommendationDividerY, coverY,
    coverWidth: 78, coverHeight, recommendationTitleY,
    footerY,
    cardHeight: footerY + 34,
  };
}
