export interface MonthlyAllocationInput {
  soheiIncome: number | null;
  yukiIncome: number | null;
  nonDateExpense: number;
}

export interface MonthlyAllocation {
  totalIncome: number;
  nonDateExpense: number;
  distributableAmount: number;
  sharePerPerson: number;
}

export function calculateMonthlyAllocation({
  soheiIncome,
  yukiIncome,
  nonDateExpense,
}: MonthlyAllocationInput): MonthlyAllocation {
  const totalIncome = (soheiIncome ?? 0) + (yukiIncome ?? 0);
  const distributableAmount = totalIncome - nonDateExpense;

  return {
    totalIncome,
    nonDateExpense,
    distributableAmount,
    sharePerPerson: distributableAmount / 2,
  };
}
