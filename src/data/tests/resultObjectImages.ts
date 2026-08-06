export const resultObjectImageMap: Record<string, string> = {
  fantasy_system_successor: "/images/detail-results/fantasy_system_window.png",
  fantasy_system_window: "/images/detail-results/fantasy_system_window.png",
  fantasy_hidden_power: "/images/detail-results/fantasy_hidden_aura.png",
  fantasy_hidden_aura: "/images/detail-results/fantasy_hidden_aura.png",
  fantasy_limit_breaker: "/images/detail-results/fantasy_limit_break.png",
  fantasy_limit_break: "/images/detail-results/fantasy_limit_break.png",
  fantasy_truth_chaser: "/images/detail-results/fantasy_truth_map.png",
  fantasy_truth_map: "/images/detail-results/fantasy_truth_map.png",
  fantasy_survival_commander:
    "/images/detail-results/fantasy_battle_fortress.png",
  fantasy_battle_fortress:
    "/images/detail-results/fantasy_battle_fortress.png",
  fantasy_kingdom_strategist:
    "/images/detail-results/fantasy_strategy_board.png",
  fantasy_strategy_board:
    "/images/detail-results/fantasy_strategy_board.png",

  murim_growth_training: "/images/detail-results/murim_growth_training.png",
  murim_absolute_power: "/images/detail-results/murim_absolute_power.png",
  murim_revenge_recovery:
    "/images/detail-results/murim_revenge_recovery.png",
  murim_sect_politics: "/images/detail-results/murim_sect_politics.png",
  murim_wanderer_justice:
    "/images/detail-results/murim_wanderer_justice.png",

  romance_contract_possession:
    "/images/detail-results/romance_contract_document.png",
  romance_contract_document:
    "/images/detail-results/romance_contract_document.png",
  romance_power_reversal:
    "/images/detail-results/romance_reversal_chess.png",
  romance_reversal_chess:
    "/images/detail-results/romance_reversal_chess.png",
  romance_emotional_growth:
    "/images/detail-results/romance_emotional_garden.png",
  romance_emotional_garden:
    "/images/detail-results/romance_emotional_garden.png",
  romance_court_politics:
    "/images/detail-results/romance_court_invitation.png",
  romance_court_invitation:
    "/images/detail-results/romance_court_invitation.png",
  romance_direct_chemistry:
    "/images/detail-results/romance_direct_heart.png",
  romance_direct_heart: "/images/detail-results/romance_direct_heart.png",
  romance_healing_companion:
    "/images/detail-results/romance_warm_teacup.png",
  romance_warm_teacup: "/images/detail-results/romance_warm_teacup.png",

  thriller_mystery_chaser:
    "/images/detail-results/thriller_mystery_clue.png",
  thriller_mystery_clue:
    "/images/detail-results/thriller_mystery_clue.png",
  thriller_survival_escape:
    "/images/detail-results/thriller_locked_exit.png",
  thriller_locked_exit: "/images/detail-results/thriller_locked_exit.png",
  thriller_occult_uncanny:
    "/images/detail-results/thriller_old_photo.png",
  thriller_old_photo: "/images/detail-results/thriller_old_photo.png",
  thriller_crime_revenge:
    "/images/detail-results/thriller_crime_trace.png",
  thriller_crime_trace: "/images/detail-results/thriller_crime_trace.png",
  thriller_psychological_tension:
    "/images/detail-results/thriller_silent_room.png",
  thriller_silent_room: "/images/detail-results/thriller_silent_room.png",
  thriller_conspiracy_twist:
    "/images/detail-results/thriller_conspiracy_file.png",
  thriller_conspiracy_file:
    "/images/detail-results/thriller_conspiracy_file.png",

  drama_life_realism: "/images/detail-results/drama_commute_window.png",
  drama_commute_window: "/images/detail-results/drama_commute_window.png",
  drama_youth_growth: "/images/detail-results/drama_worn_sneakers.png",
  drama_worn_sneakers: "/images/detail-results/drama_worn_sneakers.png",
  drama_healing_daily: "/images/detail-results/drama_warm_cafe.png",
  drama_warm_cafe: "/images/detail-results/drama_warm_cafe.png",
  drama_family_relationship:
    "/images/detail-results/drama_family_note.png",
  drama_family_note: "/images/detail-results/drama_family_note.png",
  drama_emotional_afterglow:
    "/images/detail-results/drama_old_letter.png",
  drama_old_letter: "/images/detail-results/drama_old_letter.png",
  drama_comedy_life: "/images/detail-results/drama_daily_laugh.png",
  drama_daily_laugh: "/images/detail-results/drama_daily_laugh.png",
};

export function getResultObjectImageSrc(imageKey?: string | null) {
  if (!imageKey) return null;
  return resultObjectImageMap[imageKey] ?? null;
}