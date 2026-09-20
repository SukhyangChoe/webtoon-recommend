export function pairTrustSentence({ score, recommenderNickname, genre }) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));

  if (normalizedScore >= 90) return `이 정도면 ${recommenderNickname}님의 최근 본 목록이 곧 추천 목록이에요.`;
  if (normalizedScore >= 80) return `${recommenderNickname}님이 재밌다고 하면 첫 3화는 믿고 가도 돼요.`;
  if (normalizedScore >= 70) return `${recommenderNickname}님의 ${genre ?? "주력 장르"} 추천은 성공 확률이 꽤 높아요.`;
  if (normalizedScore >= 55) return "겹치는 장르부터 추천받아 보세요. 실패 확률이 낮아요.";
  if (normalizedScore >= 40) return "추천받기 전에 장르만 한 번 확인하세요. 취향이 반반이에요.";
  return "추천은 참고만 하세요. 각자 볼 것을 보는 편이 평화롭습니다.";
}
