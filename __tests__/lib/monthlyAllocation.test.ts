import { describe, expect, test } from "vitest";
import { calculateMonthlyAllocation } from "@/lib/monthlyAllocation";

describe("calculateMonthlyAllocation", () => {
  test("二人の手取り合計からデート以外の支出を引き、均等に取り分を計算する", () => {
    expect(
      calculateMonthlyAllocation({
        soheiIncome: 300_000,
        yukiIncome: 220_000,
        nonDateExpense: 120_000,
      }),
    ).toEqual({
      totalIncome: 520_000,
      nonDateExpense: 120_000,
      distributableAmount: 400_000,
      sharePerPerson: 200_000,
    });
  });

  test("収入または支出が未入力でもゼロとして計算できる", () => {
    expect(
      calculateMonthlyAllocation({
        soheiIncome: null,
        yukiIncome: 200_000,
        nonDateExpense: 30_000,
      }),
    ).toEqual({
      totalIncome: 200_000,
      nonDateExpense: 30_000,
      distributableAmount: 170_000,
      sharePerPerson: 85_000,
    });
  });
});
