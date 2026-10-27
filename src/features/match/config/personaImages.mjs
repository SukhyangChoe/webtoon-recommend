// Approved 2026-10-22: original portraits for taste results; matching SDs for relationship maps.
// Versioned paths keep the previous artwork intact and avoid stale image caches.
const PERSONAS = {
  fantasy: ["판타지", "나침반 수정을 든 푸른 머리 모험가"],
  murim: ["무협", "비급 통을 든 장난스러운 무협 고수"],
  romance: ["로맨스", "휴대폰을 든 노란 카디건의 로맨스 주인공"],
  ropan: ["로판", "봉인된 편지를 든 초록 드레스의 귀족 주인공"],
  action: ["액션", "붕대를 감은 주먹을 올린 액션 주인공"],
  thriller_horror: ["스릴러·공포", "손전등을 들고 주위를 경계하는 주인공"],
  drama_daily: ["드라마·일상", "커피를 든 포근한 카디건의 일상 주인공"],
  comedy: ["코미디", "휴대폰을 보며 배를 잡고 웃는 코미디 주인공"],
  sports: ["스포츠", "농구공을 든 헤어밴드의 스포츠 주인공"],
};

export const PERSONA_GENRE_KEYS = Object.freeze(Object.keys(PERSONAS));

/** Keep the two uses explicit: result portraits must not silently become SD avatars. */
export function personaImageFor(genreKey, variant = "original") {
  const key = Object.hasOwn(PERSONAS, genreKey) ? genreKey : "fantasy";
  const [label, description] = PERSONAS[key];
  const version = variant === "sd" ? "sd-v1" : "original-v1";
  return {
    src: `/match/personas/${version}/${key}.png`,
    alt: variant === "sd" ? `${label} 취향 SD 캐릭터: ${description}` : `${label} 취향 캐릭터: ${description}`,
  };
}
