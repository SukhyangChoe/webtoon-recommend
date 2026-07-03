import { fantasyTest } from "./fantasy";
import { fantasyResults } from "./fantasyResults";
import { murimTest } from "./murim";
import { murimResults } from "./murimResults";
import { romanceRopanTest } from "./romanceRopan";
import { romanceRopanResults } from "./romanceRopanResults";

export const detailTestConfigs = {
  fantasy_detail: {
    testKey: "fantasy_detail",
    route: "/tests/fantasy",
    testData: fantasyTest,
    results: fantasyResults,
  },

  murim_detail: {
    testKey: "murim_detail",
    route: "/tests/murim",
    testData: murimTest,
    results: murimResults,
  },

  romance_ropan_detail: {
    testKey: "romance_ropan_detail",
    route: "/tests/romance-ropan",
    testData: romanceRopanTest,
    results: romanceRopanResults,
  },
};

export type DetailTestKey = keyof typeof detailTestConfigs;

export type DetailTestConfig =
  (typeof detailTestConfigs)[keyof typeof detailTestConfigs];

export function getDetailTestConfig(testKey: DetailTestKey) {
  return detailTestConfigs[testKey];
}

export const detailTestRoutes: Record<DetailTestKey, string> = {
  fantasy_detail: "/tests/fantasy",
  murim_detail: "/tests/murim",
  romance_ropan_detail: "/tests/romance-ropan",
};

export const detailTestKeys = Object.keys(
  detailTestConfigs
) as DetailTestKey[];