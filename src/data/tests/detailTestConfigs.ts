import { fantasyTest } from "./fantasy";
import { fantasyResults } from "./fantasyResults";
import { murimTest } from "./murim";
import { murimResults } from "./murimResults";
import { romanceRopanTest } from "./romanceRopan";
import { romanceRopanResults } from "./romanceRopanResults";
import { thrillerHorrorTest } from "./thrillerHorror";
import { thrillerHorrorResults } from "./thrillerHorrorResults";
import { dramaDailyTest } from "./dramaDaily";
import { dramaDailyResults } from "./dramaDailyResults";

import type {
  DetailTestConfig as CommonDetailTestConfig,
  DetailTestData,
  DetailTestKey as CommonDetailTestKey,
  DetailTestResult,
  DetailTestRoute,
} from "@/types/detailTest";

type ActiveDetailTestKey = Extract<
  CommonDetailTestKey,
  | "fantasy_detail"
  | "murim_detail"
  | "romance_ropan_detail"
  | "thriller_horror_detail"
  | "drama_daily_detail"
>;

type DetailTestConfigMap = Record<ActiveDetailTestKey, CommonDetailTestConfig>;

export const detailTestConfigs: DetailTestConfigMap = {
  fantasy_detail: {
    testKey: "fantasy_detail",
    route: "/tests/fantasy",
    testData: fantasyTest as unknown as DetailTestData,
    results: fantasyResults as unknown as DetailTestResult[],
  },

  murim_detail: {
    testKey: "murim_detail",
    route: "/tests/murim",
    testData: murimTest as unknown as DetailTestData,
    results: murimResults as unknown as DetailTestResult[],
  },

  romance_ropan_detail: {
    testKey: "romance_ropan_detail",
    route: "/tests/romance-ropan",
    testData: romanceRopanTest as unknown as DetailTestData,
    results: romanceRopanResults as unknown as DetailTestResult[],
  },

  thriller_horror_detail: {
    testKey: "thriller_horror_detail",
    route: "/tests/thriller-horror",
    testData: thrillerHorrorTest as unknown as DetailTestData,
    results: thrillerHorrorResults as unknown as DetailTestResult[],
  },

  drama_daily_detail: {
    testKey: "drama_daily_detail",
    route: "/tests/drama-daily",
    testData: dramaDailyTest as unknown as DetailTestData,
    results: dramaDailyResults as unknown as DetailTestResult[],
  },
};

export type DetailTestKey = keyof typeof detailTestConfigs;

export type DetailTestConfig = (typeof detailTestConfigs)[DetailTestKey];

export function getDetailTestConfig(testKey: DetailTestKey): DetailTestConfig {
  return detailTestConfigs[testKey];
}

export const detailTestRoutes: Record<DetailTestKey, DetailTestRoute> = {
  fantasy_detail: "/tests/fantasy",
  murim_detail: "/tests/murim",
  romance_ropan_detail: "/tests/romance-ropan",
  thriller_horror_detail: "/tests/thriller-horror",
  drama_daily_detail: "/tests/drama-daily",
};

export const detailTestKeys = Object.keys(
  detailTestConfigs
) as DetailTestKey[];