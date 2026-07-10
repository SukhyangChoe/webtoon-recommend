export const CONTENT_AXIS_LABELS: Record<string, string> = {
    hunter_dungeon: "헌터·던전",
    system_growth: "시스템 성장",
    game_system: "게임 시스템",
    tower_climb: "탑·던전 공략",
    dungeon_survival: "던전 생존",
    crafting_management: "제작·운영",
    hidden_power: "숨겨진 힘",
    academy_magic: "아카데미·마법",
    magic_research: "마법 탐구",
    kingdom_strategy: "왕국 전략",
    noble_family_politics: "가문 정치",
    regression_revenge: "회귀·복수",
    reincarnation_second_chance: "환생·두 번째 기회",
    apocalypse_survival: "아포칼립스 생존",
    world_secret: "세계의 비밀",
  
    murim_training: "무공 수련",
    murim_revenge: "문파 복수",
    murim_absolute_power: "천하 군림",
    murim_sect_politics: "문파 정치",
    murim_wanderer_justice: "협객 여정",
  
    contract_possession: "계약·빙의",
    palace_politics: "궁정·가문",
    romance_power_reversal: "주도권 역전",
    emotional_growth: "감정선 성장",
    direct_chemistry: "직진 케미",
    healing_companion: "힐링 동행",
  
    mystery_chaser: "추리·단서",
    occult_uncanny: "오컬트·괴이",
    psychological_tension: "심리 압박",
    survival_escape: "생존 탈출",
    crime_revenge: "범죄·응징",
    conspiracy_twist: "음모·반전",
  
    daily_realism: "현실 공감",
    youth_growth: "청춘 성장",
    healing_daily: "힐링 일상",
    family_relationship: "가족·관계",
    emotional_afterglow: "감정 여운",
    workplace_comedy: "직장·생활 코미디",
  
    sports_growth: "스포츠 성장",
    entertainment_industry: "연예계",
    cooking_food: "요리·음식",
    pet_daily: "반려동물 일상",
  };
  
  export function getContentAxisLabel(axisKey: string) {
    return CONTENT_AXIS_LABELS[axisKey] ?? null;
  }