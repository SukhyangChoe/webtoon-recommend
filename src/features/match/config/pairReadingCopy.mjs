/** Original editorial scenes, not measured personality traits or recommendation probabilities. */
export const PAIR_READING_VERSION = 'pair_reading_v1';

export const PAIR_READING_INTROS = Object.freeze({
  co_owned_favorites: '취향이 가까워 추천 링크에 긴 설명이 필요 없는 사이예요. 문제는 서로 말릴 사람이 없다는 것.',
  all_night_binge_mates: '같이 볼 작품을 찾으면 든든한 정주행 동료가 될 조합이에요. 종료 버튼 담당은 따로 구해야겠어요.',
  recommendation_guarantee: '취향이 만나는 장르부터 추천을 건네기 좋은 사이예요. “네 생각나서 보냈어”에 슬쩍 링크가 따라올 조합이죠.',
  genre_exchange_party: '익숙한 취향으로 문을 열고, 서로의 새로운 장르를 구경하기 좋은 조합이에요. 입장할 때보다 찜 목록이 길어질지도요.',
  taste_showdown_rivals: '통하는 지점도, 고개를 갸웃할 지점도 있는 조합이에요. 감상은 달라도 감상회가 조용할 일은 없겠어요.',
  opposite_shelf_guide: '각자의 서가에 서로에게 낯선 재미가 숨어 있는 조합이에요. 추천을 받을 땐 “어디가 좋았어?”라는 한마디를 챙겨보세요.',
  unknown: '두 사람의 취향으로 짧은 감상회를 상상해봤어요. 실제 반응은 같이 펼쳐봐야 알겠죠?',
});

// Each entry is a complete scene. Never splice genre nouns into unrelated jokes.
export const PAIR_READING_SCENES = Object.freeze({
  murim_growth: {
    dialogue: ['아직 주인공이 약한데?', '그래서 봐야지.'],
    scene: '주인공이 수련을 시작하면 둘 다 자세를 고쳐 앉을 조합이에요. “경지 하나만 더 올라가는 거 보고 자자” 하고 합의할지도요.',
    punchline: '주인공은 벽을 넘고, 두 사람은 기상 시간을 넘깁니다.',
  },
  fantasy_growth: {
    dialogue: ['레벨 1부터 다시라고?', '좋아. 이번엔 어디까지 크나 보자.'],
    scene: '작은 스킬 하나가 생겨도 같이 장래를 점쳐볼 조합이에요. 처음 받은 허름한 아이템까지 기억해뒀다가 나중에 서로 아는 척할지도요.',
    punchline: '주인공 성장 일지인데, 보호자 서명란에는 두 사람 이름이 들어갑니다.',
  },
  sports_growth: {
    dialogue: ['이번엔 이기겠지?', '일단 저 선수 폼 좋아진 것 좀 봐.'],
    scene: '승패만큼 연습의 흔적에도 눈길이 가는 조합이에요. 벤치에 앉아 있던 선수가 첫 득점을 하면 둘이 동시에 휴대폰을 고쳐 잡을지도요.',
    punchline: '뛴 건 선수인데, 끝나고 물 찾는 건 두 사람입니다.',
  },
  romance_slow: {
    dialogue: ['그래서 둘이 사귀었어?', '아니. 오늘 처음으로 이름 불렀어.'],
    scene: '작은 변화에도 감상회가 길어질 조합이에요. 남들은 진도가 안 나간다는데 두 사람은 이미 손등 한 번 스친 장면을 다시 보고 있을지도요.',
    punchline: '작중 시간은 3초 지났고, 두 사람의 채팅은 30줄 늘었습니다.',
  },
  ropan_strategy: {
    dialogue: ['오늘 무도회에서 고백하나?', '잠깐. 저 집안 좌석부터 봐.'],
    scene: '화려한 드레스 뒤에서 누가 판을 짜는지도 궁금한 조합이에요. 초대장 한 장을 두고 둘이 인맥과 이해관계를 정리하기 시작할지도요.',
    punchline: '무도회에 독자 둘이 들어갔는데, 나올 때는 인사팀이 되어 있습니다.',
  },
  thriller_reveal: {
    dialogue: ['범인 알 것 같아.', '너 그 말 벌써 네 번째야.'],
    scene: '반전이 나오면 앞 장면부터 같이 확인하고 싶어질 조합이에요. 수상한 표정 하나에도 가설이 생겨, 아무 잘못 없는 엑스트라까지 후보에 오를지도요.',
    punchline: '등장인물은 여섯 명인데, 용의자 명단은 열두 명입니다.',
  },
  shared_bond: {
    dialogue: ['혼자 두고 갈 줄 알았냐.', '…야, 너도 지금 울어?'],
    scene: '좋아하는 장르가 달라도 누군가 돌아와 동료의 편에 서는 장면에선 같은 곳을 볼 수 있겠어요. 괜히 목을 가다듬으며 다음 화를 누를지도요.',
    punchline: '취향은 각자인데, 휴지 찾는 타이밍은 같습니다.',
  },
  shared_growth: {
    dialogue: ['처음엔 이것도 못했잖아.', '내가 그때부터 봤다니까.'],
    scene: '인물이 조금씩 해내는 과정에 같이 마음을 줄 조합이에요. 중요한 순간이 오면 첫 회의 서툰 모습부터 꺼내며 감상회가 길어질지도요.',
    punchline: '주인공은 성장했는데, 두 사람은 자꾸 “우리 애가요”로 말문을 엽니다.',
  },
  shared_slow: {
    dialogue: ['오늘은 좀 가까워졌네.', '지난번보다 의자 하나 덜 떨어져 있어.'],
    scene: '관계가 쌓이는 작은 변화를 같이 찾아볼 조합이에요. 별일 없는 대화처럼 보여도 호칭 하나, 시선 하나에 의미를 붙여볼지도요.',
    punchline: '주인공들은 아직 모르는 사이인데, 두 사람은 벌써 기념일을 세고 있습니다.',
  },
  shared_payoff: {
    dialogue: ['이번에도 참으면 나 진짜…', '왔다. 드디어 말한다.'],
    scene: '쌓아둔 답답함이 풀리는 순간에 같이 고개를 끄덕일 조합이에요. 악역의 말문이 막히면 두 사람의 채팅창은 오히려 바빠질지도요.',
    punchline: '사이다는 주인공이 마셨는데, 속이 뚫린 두 사람이 먼저 계산합니다.',
  },
  shared_strategy: {
    dialogue: ['이것까지 계획이었어?', '잠깐. 처음부터 다시 보자.'],
    scene: '큰 한 방 뒤에 어떤 준비가 있었는지 함께 찾아볼 조합이에요. 결과를 보고 나면 앞에서 지나친 대사까지 다시 펼쳐보게 될지도요.',
    punchline: '한 화를 읽으러 들어갔다가, 둘이 같이 감사 보고서를 쓰고 있습니다.',
  },
  shared_reveal: {
    dialogue: ['헐. 그러면 아까 그 장면이…', '지금 나도 거기 다시 보는 중.'],
    scene: '반전 하나에 같은 장면을 새롭게 읽는 재미를 나눌 조합이에요. 서로 다른 단서를 들고 왔다가 두 가설이 만나는 순간 말이 빨라질지도요.',
    punchline: '다음 화 버튼보다 이전 화 버튼이 더 바빠졌습니다.',
  },
  shared_comedy: {
    dialogue: ['그 장면 봤어?', '말하지 마. 또 웃겨.'],
    scene: '한마디의 타이밍과 주고받는 호흡을 같이 즐길 조합이에요. 웃긴 대사를 일상에 한 번 써먹기 시작하면 둘만 아는 말이 늘어날지도요.',
    punchline: '옆 사람은 무슨 일인지 모르는데, 두 사람은 눈만 마주쳐도 웃습니다.',
  },
  shared_healing: {
    dialogue: ['딱히 해결된 건 없는데 좋다.', '그냥 옆에 있어줬잖아.'],
    scene: '대단한 해결보다 곁을 지키는 장면에서 같이 멈춰볼 조합이에요. 다 읽고 감상을 쓰려다가 “그 장면…”만 보내고 잠깐 조용해질지도요.',
    punchline: '감상회는 열었는데, 정작 제일 중요한 순간엔 둘 다 말이 없습니다.',
  },
  shared_world: {
    dialogue: ['이 세계 규칙이 뭐였지?', '내가 정리한 거 보내줄게.'],
    scene: '이야기 뒤에 놓인 세계의 규칙을 함께 들여다볼 조합이에요. 설정을 하나 알아내면 다른 장면과 연결해보며 이야기가 길어질지도요.',
    punchline: '가볍게 읽자고 만났는데, 어느새 공유 문서가 하나 생겼습니다.',
  },
  contrast_slow_direct: {
    dialogue: ['이제는 고백 좀 해라.', '지금 눈 피한 게 고백이나 마찬가지야.'],
    scene: '한 명은 마음을 바로 보여주는 케미에, 한 명은 차곡차곡 쌓이는 관계에 먼저 눈길이 가요. 같은 장면을 두고도 “진도 나갔다”의 기준이 다를 수 있겠어요.',
    punchline: '한쪽은 청첩장을 기다리고, 한쪽은 호칭 바뀐 날에 밑줄을 긋습니다.',
  },
  contrast_strategy_action: {
    dialogue: ['일단 문부터 부수면 안 돼?', '잠깐. 저 문을 열게 만든 이유가 있어.'],
    scene: '한 명은 시원한 액션에, 한 명은 그 전에 깔아둔 설계에 먼저 눈길이 가요. 같은 작전을 봐도 한쪽은 실행 장면을, 한쪽은 준비 장면을 다시 펼칠지도요.',
    punchline: '둘이 작전을 짜면 회의록 한 장 쓰기도 전에 문이 없어져 있습니다.',
  },
  genre_murim: {
    dialogue: ['이름이 뭐였지?', '일단 장문인인 건 확실해.'],
    scene: '무협을 함께 펼치면 문파와 별호를 두고 짧은 확인 회의가 열릴지도요. “그때 그 검 쓰던 사람”만으로 대화가 통하면 제법 든든한 강호 동료겠어요.',
    punchline: '주인공은 정체를 숨기는데, 두 사람은 이름을 기억 못해서 비밀을 지켜줍니다.',
  },
  genre_fantasy: {
    dialogue: ['이 스킬 설명 읽었어?', '읽었는데, 일단 써봐야 알겠어.'],
    scene: '판타지를 함께 펼치면 낯선 세계에 두 사람이 나란히 입장하는 셈이에요. 새로운 규칙을 만날 때마다 각자 이해한 내용을 맞춰볼지도요.',
    punchline: '이세계 입국은 했는데, 두 사람 다 튜토리얼 창을 닫을 줄 모릅니다.',
  },
  genre_romance: {
    dialogue: ['방금 왜 웃었지?', '너도 그 표정 봤지?'],
    scene: '로맨스를 함께 펼치면 짧은 표정 하나도 감상회 안건이 될 수 있겠어요. 대사는 한 줄인데 둘이 주고받는 해석은 길어질지도요.',
    punchline: '당사자는 그냥 웃었는데, 두 사람은 벌써 인터뷰 질문을 준비했습니다.',
  },
  genre_ropan: {
    dialogue: ['그 공작 말고 다른 공작.', '아, 어제 파혼한 쪽?'],
    scene: '로판을 함께 펼치면 황궁 소식부터 인물 관계까지 확인할 이야기가 많겠어요. 가문의 이름보다 “그때 그 사건”으로 인물을 찾게 될지도요.',
    punchline: '황실에 취직한 적은 없는데, 둘 다 내부 사정은 좀 압니다.',
  },
  genre_action: {
    dialogue: ['방금 어떻게 피한 거야?', '나도 몰라. 멋있으니까 한 번 더.'],
    scene: '액션을 함께 펼치면 박진감 있는 한 컷을 앞뒤로 돌려보는 시간이 생길지도요. 손가락만 움직였는데도 한 판 끝낸 듯 잠깐 숨을 고를 수 있겠어요.',
    punchline: '싸운 건 주인공인데, 다 읽고 나면 둘 다 자세가 앞으로 나와 있습니다.',
  },
  genre_thriller_horror: {
    dialogue: ['너 아직 보고 있어?', '응. 너도 안 잤지?'],
    scene: '스릴러·공포를 함께 펼치면 무서운 장면 뒤에 생존 확인 메시지가 오갈지도요. 다음 화로 넘어가기 전에 상대의 접속 표시부터 살펴볼 수 있겠어요.',
    punchline: '같이 보기의 장점은 명확합니다. 무서우면 둘 다 잠을 못 잡니다.',
  },
  genre_drama_daily: {
    dialogue: ['이 사람 말이 좀 이해돼.', '근데 저 사람 입장도 들어봐.'],
    scene: '드라마·일상을 함께 펼치면 누구 편인지보다 왜 그랬는지를 두고 이야기가 길어질지도요. 별일 없어 보이는 한 끼 식사도 감상회 주제가 될 수 있겠어요.',
    punchline: '등장인물은 밥 한 끼 먹었는데, 두 사람은 인간관계 회의를 한 시간 했습니다.',
  },
  genre_comedy: {
    dialogue: ['설명해봐. 어디가 웃긴데?', '아니, 이건 직접 봐야 돼.'],
    scene: '코미디를 함께 펼치면 웃긴 장면을 설명하다가 설명하는 쪽이 먼저 웃을지도요. 결국 링크 하나를 보내고 상대의 답장을 기다리게 될 수 있겠어요.',
    punchline: '추천 사유는 다섯 글자면 됩니다. “아 일단 봐봐.”',
  },
  genre_sports: {
    dialogue: ['한 점만. 제발 한 점만.', '너 지금 숨 안 쉬어.'],
    scene: '스포츠를 함께 펼치면 경기 막판에 채팅이 뚝 끊길지도요. 결과를 확인한 뒤에야 서로 같은 장면에서 멈춰 있었다는 걸 알게 될 수 있겠어요.',
    punchline: '선수는 타임아웃을 받았는데, 두 사람은 계속 긴장 중입니다.',
  },
  fallback_co_owned_favorites: {
    dialogue: ['이거 너도 좋아할 것 같아서.', '나 지금 그거 추천하려고 했는데.'],
    scene: '비슷한 재미를 찾는 두 사람이 추천 링크를 주고받는 장면을 상상해봤어요. 상대의 답장을 기다릴 틈도 없이 같은 링크가 돌아올지도요.',
    punchline: '추천은 두 번 왔는데, 새로 알게 된 작품은 한 편입니다.',
  },
  fallback_all_night_binge_mates: {
    dialogue: ['딱 세 화만 보고 자자.', '좋아. 세 화마다 다시 얘기하자.'],
    scene: '함께 읽기 시작하면 중간중간 “어디까지 봤어?”라는 확인이 오갈 조합이에요. 먼저 끝낸 사람이 다음 추천까지 준비하고 있을지도요.',
    punchline: '독서 모임은 끝났는데, 해산에 동의한 사람은 없습니다.',
  },
  fallback_recommendation_guarantee: {
    dialogue: ['이거 봐봐. 딱 네 생각났어.', '그 말까지 하니까 궁금하네.'],
    scene: '둘의 취향이 겹치는 곳부터 추천을 건네보세요. 긴 줄거리보다 “어느 장면이 좋았는지” 한마디에 손이 갈 수도 있겠어요.',
    punchline: '추천 링크는 한 줄인데, 다 보고 보낼 답장은 장문이 될지도요.',
  },
  fallback_genre_exchange_party: {
    dialogue: ['내가 이런 것도 볼까?', '일단 입구까지만 같이 가보자.'],
    scene: '익숙한 재미 하나를 발판으로 상대의 서가를 구경해볼 조합이에요. 생각보다 재미있는 장면을 만나면 추천해준 사람에게 할 말이 생길지도요.',
    punchline: '구경만 하러 갔는데, 돌아오는 길엔 찜 목록이 무거워졌습니다.',
  },
  fallback_taste_showdown_rivals: {
    dialogue: ['여기가 제일 재밌지 않아?', '나는 바로 앞 장면이 더 좋았는데.'],
    scene: '같은 작품에서도 서로 다른 장면에 밑줄을 그을 수 있는 조합이에요. 감상이 갈린 이유를 듣다 보면 다시 볼 장면이 하나쯤 생길지도요.',
    punchline: '별점 회의는 끝났는데, 감상 발표는 아직 2부입니다.',
  },
  fallback_opposite_shelf_guide: {
    dialogue: ['네 서가엔 이런 것도 있어?', '너는 대체 어디서 그걸 찾았어?'],
    scene: '서로의 추천 목록이 낯선 서점 구경처럼 느껴질 수 있는 조합이에요. 취향을 바꾸려 애쓰기보다 한 편의 매력을 소개해주는 가이드가 되어보세요.',
    punchline: '각자 한 편만 소개하기로 했는데, 둘 다 발표 자료가 생겼습니다.',
  },
  fallback_unknown: {
    dialogue: ['뭐부터 같이 볼까?', '각자 한 편씩 가져와볼까?'],
    scene: '아직 두 사람을 비교할 단서가 충분하지 않아요. 서로 좋아한 장면부터 이야기하면 다음 추천의 출발점을 찾을 수 있겠어요.',
    punchline: '감상회 이름은 정했는데, 첫 상영작은 아직 회의 중입니다.',
  },
});

/** Editorial precedence only: specific shared genre/feature, shared feature, primary contrast, genre. */
export const PAIR_READING_RULES = Object.freeze([
  { key:'murim_growth', genre:'murim', sharedAny:['appeal_growth_training','character_effortful_protagonist'] },
  { key:'fantasy_growth', genre:'fantasy', sharedAny:['appeal_growth_training','character_effortful_protagonist'] },
  { key:'sports_growth', genre:'sports', sharedAny:['appeal_growth_training','character_effortful_protagonist'] },
  { key:'romance_slow', genre:'romance', sharedAny:['relationship_slow_build'] },
  { key:'ropan_strategy', genre:'ropan', sharedAny:['appeal_strategy_powerplay'] },
  { key:'thriller_reveal', genre:'thriller_horror', sharedAny:['appeal_twist_reveal','setting_case_mystery'] },
  { key:'shared_bond', sharedAny:['relationship_bond'] },
  { key:'shared_growth', sharedAny:['appeal_growth_training','character_effortful_protagonist'] },
  { key:'shared_slow', sharedAny:['relationship_slow_build'] },
  { key:'shared_payoff', sharedAny:['appeal_revenge_justice','character_justice_rebellion'] },
  { key:'shared_strategy', sharedAny:['appeal_strategy_powerplay'] },
  { key:'shared_reveal', sharedAny:['appeal_twist_reveal'] },
  { key:'shared_comedy', sharedAny:['appeal_humor_banter'] },
  { key:'shared_healing', sharedAny:['relationship_healing'] },
  { key:'shared_world', sharedAny:['appeal_world_mystery'] },
]);

export const PAIR_READING_CONTRASTS = Object.freeze([
  { key:'contrast_slow_direct', group:'characterRelationship', pair:['relationship_slow_build','relationship_direct_chemistry'] },
  { key:'contrast_strategy_action', group:'appeal', pair:['appeal_strategy_powerplay','appeal_action_catharsis'] },
]);
