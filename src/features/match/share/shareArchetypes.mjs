const OPPOSITE_SHELF_ARCHETYPE = {
  min: 0,
  key: "opposite_shelf_guide",
  name: "반대편 서가 안내자",
  badge: "미개척 장르 담당",
  symbol: "⌁",
  theme: "navy",
  description: "내가 안 가본 장르를 가장 잘 아는 사람. 서로의 미개척지를 맡아주는 조합이에요.",
};

const PAIR_ARCHETYPES = [
  {
    min: 90,
    key: "co_owned_favorites",
    name: "최애작 공동명의",
    badge: "취향 싱크 최상",
    symbol: "✦",
    theme: "violet",
    description: "서로의 찜 목록을 합쳐도 위화감 0. 다음 화 버튼은 사실상 공동 재산이에요.",
  },
  {
    min: 80,
    key: "all_night_binge_mates",
    name: "밤샘 정주행 메이트",
    badge: "같이 달리면 완주",
    symbol: "☾",
    theme: "indigo",
    description: "한 작품만 같이 시작해도 둘 다 마지막 화에서 발견될 조합이에요.",
  },
  {
    min: 70,
    key: "recommendation_guarantee",
    name: "추천 적중 보증수표",
    badge: "영업 성공률 높음",
    symbol: "✓",
    theme: "mint",
    description: "주력 장르 추천은 높은 확률로 성공. 서로의 찜 목록을 빠르게 불려줘요.",
  },
  {
    min: 55,
    key: "genre_exchange_party",
    name: "장르 교환 원정대",
    badge: "겹치고 넓어지는 사이",
    symbol: "↗",
    theme: "lilac",
    description: "겹치는 서가에서 출발해 서로 다른 장르까지 원정 가기 좋은 조합이에요.",
  },
  {
    min: 40,
    key: "taste_showdown_rivals",
    name: "취향 맞다이 라이벌",
    badge: "토론할 맛 나는 조합",
    symbol: "⚡",
    theme: "coral",
    description: "같은 앱을 켜고도 다른 작품을 고르는 선의의 라이벌. 그래서 얘기할 거리가 넘쳐요.",
  },
  OPPOSITE_SHELF_ARCHETYPE,
];

const PERSONAL_ARCHETYPES = {
  fantasy: { name: "회귀 버튼 단골손님", description: "세계가 망해도 다음 화부터 확인하는 판타지 정주행러.", imageSrc: "/match/personas/fantasy-v2.png", imageAlt: "깨진 시간 마법을 되돌리는 판타지 본캐" },
  murim: { name: "내공 만렙 정주행러", description: "수련 한 번, 경지 상승 한 번에 같이 강해지는 무협 체질.", imageSrc: "/match/personas/murim-v2.png", imageAlt: "비급과 내공을 펼치는 무협 고수 본캐" },
  romance: { name: "심쿵 장면 수집가", description: "눈빛 한 번과 말풍선 하나도 놓치지 않는 감정선 채집가.", imageSrc: "/match/personas/romance.png", imageAlt: "설레는 장면을 스크랩북에 모으는 로맨스 본캐" },
  ropan: { name: "황궁 서사 VIP", description: "빙의부터 계약결혼까지, 황궁 소식은 누구보다 빠른 독자.", imageSrc: "/match/personas/ropan-v2.png", imageAlt: "황궁 계약서에 인장을 찍는 로맨스 판타지 본캐" },
  action: { name: "사이다 타격감 감별사", description: "답답함은 짧게, 반격은 시원하게 터져야 다음 화를 누르는 타입.", imageSrc: "/match/personas/action-v2.png", imageAlt: "전력을 다해 결정타를 날리는 액션 본캐" },
  thriller_horror: { name: "복선 추적 야간반", description: "수상한 컷은 확대하고 떡밥은 끝까지 회수하는 심야 추적자.", imageSrc: "/match/personas/thriller-horror-v2.png", imageAlt: "손전등을 들고 뒤를 경계하는 스릴러 본캐" },
  drama_daily: { name: "감정선 밀착 관찰자", description: "큰 사건보다 사람 마음이 움직이는 한 컷에 오래 머무는 독자.", imageSrc: "/match/personas/drama-daily-v2.png", imageAlt: "커피와 수첩을 동시에 챙기는 귀여운 일상 드라마 본캐" },
  comedy: { name: "웃음컷 저장 장인", description: "타이밍 좋은 한 컷이면 장르를 넘어 바로 정주행하는 타입.", imageSrc: "/match/personas/comedy-v2.png", imageAlt: "휴대폰을 놓칠 만큼 크게 웃는 코미디 본캐" },
  sports: { name: "역전 서사 응원단장", description: "훈련의 땀과 마지막 1초의 뒤집기에 누구보다 진심인 독자.", imageSrc: "/match/personas/sports-v2.png", imageAlt: "역전의 순간을 이끄는 농구 선수 본캐" },
};

export function pairArchetypeFor(score) {
  const normalized = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  return PAIR_ARCHETYPES.find((archetype) => normalized >= archetype.min) ?? OPPOSITE_SHELF_ARCHETYPE;
}

export function personalArchetypeFor(genreKey) {
  const persona = PERSONAL_ARCHETYPES[genreKey] ?? {
    name: "다음 화 버튼 수호자",
    description: "재밌는 웹툰이라면 장르를 넘어 끝까지 확인하는 독자.",
    imageSrc: "/match/personas/fantasy-v2.png",
    imageAlt: "마법책을 펼쳐 다음 이야기를 찾는 웹툰 본캐",
  };
  return { ...persona, symbol: "★", theme: "violet" };
}
