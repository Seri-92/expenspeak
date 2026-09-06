export const fixedCostItems = ["家賃", "電気代", "ガス代", "水道代", "インターネット代"] as const;
export type FixedCostItem = (typeof fixedCostItems)[number];
export const allocationCategories = [
  { key: "food_category_id", label: "食費" },
  { key: "supplies_category_id", label: "日用品" },
  { key: "work_category_id", label: "外で仕事にかかるお金" },
] as const;

export function getCurrentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}`;
}

export function formatMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return `${year}年${number}月`;
}

export function formatYen(amount: number) {
  return `${amount.toLocaleString("ja-JP")} 円`;
}

export function getAllocationPeriod(incomeMonth: string) {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(incomeMonth)) {
    throw new Error("年月を選択してください。");
  }
  const [year, month] = incomeMonth.split("-").map(Number);
  const expenseMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
  return {
    incomeMonth, expenseMonth,
    expenseStart: new Date(`${expenseMonth}-01T00:00:00+09:00`).toISOString(),
    expenseEnd: new Date(`${incomeMonth}-01T00:00:00+09:00`).toISOString(),
  };
}

export function parseMonthlyAmount(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim()) || Number(value) > 2147483647) {
    throw new Error("金額は0〜2,147,483,647円の整数で入力してください。");
  }
  return Number(value);
}

export function sumExpensesByCategory(
  expenses: { category_id: number; amount: number }[], categoryIds: number[],
) {
  const totals: Record<number, number> = Object.fromEntries(categoryIds.map((id) => [id, 0]));
  for (const expense of expenses) {
    if (Object.hasOwn(totals, expense.category_id)) totals[expense.category_id] += expense.amount;
  }
  return totals;
}

export interface MonthlyAllocationInput {
  incomes: (number | null)[];
  fixedCosts: (number | null)[];
  variableExpense: number;
}

// 正なら優希から創平、負なら創平から優希に送る。
export function calculateMonthlyTransfer(yukiIncome: number | null, sharePerPerson: number | null) {
  if (yukiIncome === null || sharePerPerson === null) return null;
  return yukiIncome - sharePerPerson;
}

export function calculateMonthlyAllocation({ incomes, fixedCosts, variableExpense }: MonthlyAllocationInput) {
  const sum = (values: (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);
  const totalIncome = sum(incomes);
  const fixedExpense = sum(fixedCosts);
  const incomplete = incomes.length !== 2 || fixedCosts.length !== 5 || [...incomes, ...fixedCosts].some((amount) => amount === null);
  const distributableAmount = incomplete ? null : totalIncome - variableExpense - fixedExpense;
  const shortfall = distributableAmount !== null ? Math.max(0, -distributableAmount) : 0;
  return {
    totalIncome, fixedExpense, variableExpense, distributableAmount,
    sharePerPerson: distributableAmount !== null && !shortfall ? Math.floor(distributableAmount / 2) : null,
    remainder: distributableAmount === null ? 0 : Math.abs(distributableAmount) % 2,
    shortfall, burdenPerPerson: Math.ceil(shortfall / 2),
    status: incomplete ? "incomplete" as const : shortfall ? "shortfall" as const : "ready" as const,
  };
}
