import { MATCH_VERSIONS } from "./versions.mjs";

export const MATCH_COMPATIBILITY_CONFIG = Object.freeze({
  version: MATCH_VERSIONS.scoring,
  overallWeights: { genre: 0.6, positive: 0.3, avoidance: 0.1 },
  genre: {
    dimensions: ["fantasy", "murim", "romance", "ropan", "action", "thriller_horror", "drama_daily", "comedy", "sports"],
    cosineWeight: 0.65,
    overlapWeight: 0.35,
  },
  positive: {
    groups: ["setting", "appeal", "character_relationship"],
    exactWeight: 0.75,
    clusterWeight: 0.25,
    clusters: {
      setting: {
        second_life_fantasy: ["setting_regression_rebirth", "setting_possession_isekai"],
        rules_training_world: ["setting_system_dungeon", "setting_school_academy"],
        court_power_world: ["setting_court_family"],
        mystery_dark_world: ["setting_case_mystery", "setting_occult_uncanny", "setting_survival_disaster"],
        real_world_stage: ["setting_real_job", "setting_idol_showbiz"],
      },
      appeal: {
        growth_reward: ["appeal_growth_training", "appeal_management_growth"],
        power_release: ["appeal_action_catharsis", "appeal_revenge_justice"],
        mind_game: ["appeal_strategy_powerplay", "appeal_twist_reveal"],
        tension_mystery: ["appeal_survival_tension", "appeal_world_mystery"],
        emotion_laugh: ["appeal_humor_banter", "appeal_emotional_afterglow"],
      },
      character_relationship: {
        power_protagonist: ["character_hidden_power", "character_effortful_protagonist", "character_overpowered", "character_justice_rebellion"],
        bond_healing: ["relationship_bond", "relationship_slow_build", "relationship_healing"],
        romance_intensity: ["relationship_direct_chemistry", "relationship_regret_obsession", "relationship_power_reversal"],
      },
    },
  },
  avoidance: {
    bothEmpty: 1,
    oneEmpty: 0.6,
    conflictWeight: 0.5,
    conflictMap: [
      ["appeal_humor_banter", "avoid_excessive_comedy", 0.75],
      ["relationship_regret_obsession", "avoid_relationship_conflict", 0.8],
      ["setting_occult_uncanny", "avoid_graphic_heavy", 0.4],
      ["setting_survival_disaster", "avoid_graphic_heavy", 0.5],
      ["appeal_survival_tension", "avoid_graphic_heavy", 0.4],
      ["appeal_twist_reveal", "avoid_complexity", 0.35],
      ["appeal_world_mystery", "avoid_complexity", 0.35],
      ["setting_case_mystery", "avoid_complexity", 0.25],
    ],
  },
  bands: [
    { min: 90, key: "almost_same", label: "거의 같은 취향", subcopy: "이 사람 추천은 꽤 믿고 봐도 될 듯" },
    { min: 80, key: "well_matched", label: "취향 잘 맞음", subcopy: "주력 장르 추천은 믿을 만한 편" },
    { min: 70, key: "quite_matched", label: "꽤 잘 맞음", subcopy: "잘 맞는 장르에선 성공 확률이 높아" },
    { min: 55, key: "genre_dependent", label: "장르 따라 잘 맞음", subcopy: "둘 다 좋아하는 장르부터 추천받자" },
    { min: 40, key: "half_split", label: "반반 갈림", subcopy: "추천받기 전에 장르 확인이 먼저" },
    { min: 0, key: "different", label: "취향이 꽤 다름", subcopy: "서로 다른 장르를 맡아주면 의외로 유용함" },
  ],
});
