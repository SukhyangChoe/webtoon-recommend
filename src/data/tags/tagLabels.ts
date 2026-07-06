export const tagLabelMap: Record<string, string> = {
    growth: "성장",
    action_catharsis: "전투 쾌감",
    hidden_identity_power: "숨겨진 힘",
    world_mystery: "세계관 비밀",
    story_immersion: "몰입감",
    system_game: "시스템 성장",
    dungeon_adventure: "던전·탑",
    strategy_powerplay: "두뇌전",
    special_ability: "특수 능력",
    visual_appeal: "작화·연출",
    second_chance: "회귀·재기",
    emotional_depth: "감정선",
    mystery_investigation: "추리·단서",
    survival_tension: "생존 긴장",
    relationship_bond: "관계성",
    management_crafting: "운영·제작",
    revenge: "복수",
    magic: "마법·초자연",
    light_healing: "힐링",
    romance_chemistry: "로맨스 케미",
    life_realism: "현실 공감",
    humor_comedy: "유쾌함",
  };
  
  export function getTagLabel(tagKey: string) {
    return tagLabelMap[tagKey] ?? null;
  }
  
  export function getTagLabels(tagKeys: string[], limit = 4) {
    const labels = tagKeys
      .map((tagKey) => getTagLabel(tagKey))
      .filter((label): label is string => Boolean(label));
  
    return [...new Set(labels)].slice(0, limit);
  }