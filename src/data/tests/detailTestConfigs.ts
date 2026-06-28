import { fantasyTest } from "@/data/tests/fantasy";
import { fantasyResults } from "@/data/tests/fantasyResults";
import { murimTest } from "@/data/tests/murim";
import { murimResults } from "@/data/tests/murimResults";
import {
  FANTASY_DETAIL_RESULT_KEY,
  MURIM_DETAIL_RESULT_KEY,
} from "@/lib/storage/testResultStorage";

export const detailTestConfigs = {
  fantasy_detail: {
    route: "/tests/fantasy",
    storageKey: FANTASY_DETAIL_RESULT_KEY,
    testData: fantasyTest,
    results: fantasyResults,
  },
  murim_detail: {
    route: "/tests/murim",
    storageKey: MURIM_DETAIL_RESULT_KEY,
    testData: murimTest,
    results: murimResults,
  },
} as const;

export type DetailTestKey = keyof typeof detailTestConfigs;