export const detailChoiceImageMap: Record<string, string> = {
  fantasy_q1_a1_image: "/images/detail-q1/fantasy_q1_a1_image.png",
  fantasy_q1_a2_image: "/images/detail-q1/fantasy_q1_a2_image.png",
  fantasy_q1_a3_image: "/images/detail-q1/fantasy_q1_a3_image.png",
  fantasy_q1_a4_image: "/images/detail-q1/fantasy_q1_a4_image.png",
  fantasy_q1_a5_image: "/images/detail-q1/fantasy_q1_a5_image.png",

  murim_q1_a1_image: "/images/detail-q1/murim_q1_a1_image.png",
  murim_q1_a2_image: "/images/detail-q1/murim_q1_a2_image.png",
  murim_q1_a3_image: "/images/detail-q1/murim_q1_a3_image.png",
  murim_q1_a4_image: "/images/detail-q1/murim_q1_a4_image.png",
  murim_q1_a5_image: "/images/detail-q1/murim_q1_a5_image.png",

  romance_q1_a1_image: "/images/detail-q1/romance_q1_a1_image.png",
  romance_q1_a2_image: "/images/detail-q1/romance_q1_a2_image.png",
  romance_q1_a3_image: "/images/detail-q1/romance_q1_a3_image.png",
  romance_q1_a4_image: "/images/detail-q1/romance_q1_a4_image.png",
  romance_q1_a5_image: "/images/detail-q1/romance_q1_a5_image.png",

  fantasy_q4_a1_image: "/images/detail-q4/fantasy_q4_a1_image.png",
  fantasy_q4_a2_image: "/images/detail-q4/fantasy_q4_a2_image.png",
  fantasy_q4_a3_image: "/images/detail-q4/fantasy_q4_a3_image.png",
  fantasy_q4_a4_image: "/images/detail-q4/fantasy_q4_a4_image.png",
  fantasy_q4_a5_image: "/images/detail-q4/fantasy_q4_a5_image.png",

  murim_q4_a1_image: "/images/detail-q4/murim_q4_a1_image.png",
  murim_q4_a2_image: "/images/detail-q4/murim_q4_a2_image.png",
  murim_q4_a3_image: "/images/detail-q4/murim_q4_a3_image.png",
  murim_q4_a4_image: "/images/detail-q4/murim_q4_a4_image.png",
  murim_q4_a5_image: "/images/detail-q4/murim_q4_a5_image.png",

  romance_q4_a1_image: "/images/detail-q4/romance_q4_a1_image.png",
  romance_q4_a2_image: "/images/detail-q4/romance_q4_a2_image.png",
  romance_q4_a3_image: "/images/detail-q4/romance_q4_a3_image.png",
  romance_q4_a4_image: "/images/detail-q4/romance_q4_a4_image.png",
  romance_q4_a5_image: "/images/detail-q4/romance_q4_a5_image.png",
};

export function getDetailChoiceImageSrc(imageKey?: string | null) {
  if (!imageKey) return null;
  return detailChoiceImageMap[imageKey] ?? null;
}
