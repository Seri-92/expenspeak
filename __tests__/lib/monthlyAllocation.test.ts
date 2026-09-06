import { describe, expect, test } from "vitest";
import {
  calculateMonthlyAllocation, calculateMonthlyTransfer, getAllocationPeriod, getCurrentMonth,
  parseMonthlyAmount, sumExpensesByCategory,
} from "@/lib/monthlyAllocation";

describe("集計期間", () => {
  test("8月の手取りには日本時間の7月の生活費を対応させる", () => {
    expect(getAllocationPeriod("2026-08")).toEqual({
      incomeMonth: "2026-08", expenseMonth: "2026-07",
      expenseStart: "2026-06-30T15:00:00.000Z", expenseEnd: "2026-07-31T15:00:00.000Z",
    });
  });
  test("1月は前年12月、3月はうるう年の2月も対象にできる", () => {
    expect(getAllocationPeriod("2026-01").expenseMonth).toBe("2025-12");
    expect(getAllocationPeriod("2024-03").expenseEnd).toBe("2024-02-29T15:00:00.000Z");
  });
  test("初期の月は端末のタイムゾーンによらず日本時間で決まる", () => {
    expect(getCurrentMonth(new Date("2026-07-31T15:00:00Z"))).toBe("2026-08");
  });
  test.each(["", "2026-00", "2026-13", "invalid"])("不正な月 %s を拒否する", (month) => {
    expect(() => getAllocationPeriod(month)).toThrow();
  });
});

describe("金額入力", () => {
  test("未入力と明示した0円を区別する", () => {
    expect(parseMonthlyAmount("")).toBeNull();
    expect(parseMonthlyAmount("  ")).toBeNull();
    expect(parseMonthlyAmount("0")).toBe(0);
    expect(parseMonthlyAmount("300000")).toBe(300000);
  });
  test.each(["-1", "1.5", "1e3", "Infinity", "2147483648"])("不正な金額 %s を拒否する", (value) => {
    expect(() => parseMonthlyAmount(value)).toThrow();
  });
});

test("名前の変更に影響されず、対象カテゴリIDだけを集計する", () => {
  expect(sumExpensesByCategory([
    { category_id: 1, amount: 100 }, { category_id: 1, amount: 200 },
    { category_id: 2, amount: 50 }, { category_id: 4, amount: 900 },
  ], [1, 2, 3])).toEqual({ 1: 300, 2: 50, 3: 0 });
});

describe("送金額（正なら優希から創平、負なら逆方向）", () => {
  test.each([
    [220000, 150000, 70000],
    [150000, 150000, 0],
    [100000, 150000, -50000],
    [220000, 149999, 70001],
    [null, 150000, null],
    [220000, null, null],
  ])("手取り %s 円、取り分 %s 円の場合は %s 円", (income, share, expected) => {
    expect(calculateMonthlyTransfer(income, share)).toBe(expected);
  });
});

describe("取り分", () => {
  const input = { incomes: [300000, 220000], fixedCosts: [100000, 10000, 10000, 0, 20000], variableExpense: 80000 };
  test("二人の当月手取りから前月の変動費と固定費を引いて二等分する", () => {
    expect(calculateMonthlyAllocation(input)).toEqual({
      totalIncome: 520000, fixedExpense: 140000, variableExpense: 80000,
      distributableAmount: 300000, sharePerPerson: 150000, remainder: 0,
      shortfall: 0, burdenPerPerson: 0, status: "ready",
    });
  });
  test("片方の収入が未入力なら取り分は計算しない", () => {
    expect(calculateMonthlyAllocation({ ...input, incomes: [300000, null] })).toMatchObject({
      status: "incomplete", sharePerPerson: null, distributableAmount: null,
    });
  });
  test("固定費の一項目が未入力でも取り分は計算しない", () => {
    expect(calculateMonthlyAllocation({ ...input, fixedCosts: [100000, 10000, 10000, null, 20000] }).status).toBe("incomplete");
  });
  test("0円は入力済みとして計算する", () => {
    expect(calculateMonthlyAllocation({ incomes: [0, 0], fixedCosts: [0, 0, 0, 0, 0], variableExpense: 0 }).status).toBe("ready");
  });
  test("奇数円は取り分を切り捨てて残額1円を明示する", () => {
    expect(calculateMonthlyAllocation({ ...input, variableExpense: 80001 })).toMatchObject({ sharePerPerson: 149999, remainder: 1 });
  });
  test("赤字は不足額と整数円の一人あたり負担額を返す", () => {
    expect(calculateMonthlyAllocation({ ...input, variableExpense: 380001 })).toMatchObject({
      status: "shortfall", sharePerPerson: null, shortfall: 1, burdenPerPerson: 1, remainder: 1,
    });
  });
});
