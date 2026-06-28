export const resultObjectImageMap: Record<string, string> = {
    fantasy_system_successor:
      "/images/detail-results/fantasy_system_successor.png",
    fantasy_hidden_power: "/images/detail-results/fantasy_hidden_power.png",
    fantasy_limit_breaker: "/images/detail-results/fantasy_limit_breaker.png",
    fantasy_truth_chaser: "/images/detail-results/fantasy_truth_chaser.png",
    fantasy_survival_commander:
      "/images/detail-results/fantasy_survival_commander.png",
    fantasy_kingdom_strategist:
      "/images/detail-results/fantasy_kingdom_strategist.png",
  
    murim_growth_training: "/images/detail-results/murim_growth_training.png",
    murim_absolute_power: "/images/detail-results/murim_absolute_power.png",
    murim_revenge_recovery: "/images/detail-results/murim_revenge_recovery.png",
    murim_sect_politics: "/images/detail-results/murim_sect_politics.png",
    murim_wanderer_justice: "/images/detail-results/murim_wanderer_justice.png",
  };
  
  export function getResultObjectImageSrc(imageKey?: string | null) {
    if (!imageKey) return null;
  
    return resultObjectImageMap[imageKey] ?? null;
  }