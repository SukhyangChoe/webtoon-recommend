import { describe, expect, it } from "vitest";

import { calculateLivingAllocatedAmount } from "@/lib/transactions/calculation";

describe("calculateLivingAllocatedAmount", () => {
  it("basis point 비율로 생활비 배정액을 계산한다", () => {
    expect(
      calculateLivingAllocatedAmount(5_000_000, 2_820),
    ).toBe(1_410_000);
  });

  it("원 단위에서 0.5 이상을 올림한다", () => {
    expect(calculateLivingAllocatedAmount(1, 5_000)).toBe(1);
  });

  it("0%와 100%를 처리한다", () => {
    expect(calculateLivingAllocatedAmount(120_000, 0)).toBe(0);
    expect(
      calculateLivingAllocatedAmount(120_000, 10_000),
    ).toBe(120_000);
  });
});
