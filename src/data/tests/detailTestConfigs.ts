import { fantasyTest } from "@/data/tests/fantasy";
import { fantasyResults } from "@/data/tests/fantasyResults";
import { murimTest } from "@/data/tests/murim";
import { murimResults } from "@/data/tests/murimResults";

export const detailTestConfigs = {
  fantasy_detail: {
    route: "/tests/fantasy",
    testData: fantasyTest,
    results: fantasyResults,
  },
  murim_detail: {
    route: "/tests/murim",
    testData: murimTest,
    results: murimResults,
  },
} as const;

export type DetailTestKey = keyof typeof detailTestConfigs;
