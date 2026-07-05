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

  thriller_q1_a1_old_photo_window:
    "/images/detail-q1/thriller_q1_a1_old_photo_window.png",
  thriller_q1_a2_missing_umbrella:
    "/images/detail-q1/thriller_q1_a2_missing_umbrella.png",
  thriller_q1_a3_erased_family:
    "/images/detail-q1/thriller_q1_a3_erased_family.png",
  thriller_q1_a4_locked_parking_exit:
    "/images/detail-q1/thriller_q1_a4_locked_parking_exit.png",
  thriller_q1_a5_hidden_symbol_photos:
    "/images/detail-q1/thriller_q1_a5_hidden_symbol_photos.png",

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

  thriller_q4_a1_image: "/images/detail-q4/thriller_q4_a1_image.png",
  thriller_q4_a2_image: "/images/detail-q4/thriller_q4_a2_image.png",
  thriller_q4_a3_image: "/images/detail-q4/thriller_q4_a3_image.png",
  thriller_q4_a4_image: "/images/detail-q4/thriller_q4_a4_image.png",
  thriller_q4_a5_image: "/images/detail-q4/thriller_q4_a5_image.png",
};

export function getDetailChoiceImageSrc(imageKey?: string | null) {
  if (!imageKey) return null;
  return detailChoiceImageMap[imageKey] ?? null;
}