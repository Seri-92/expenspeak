import { supabase } from "@/lib/supabaseClient";
import { allocationCategories, getAllocationPeriod } from "@/lib/monthlyAllocation";
import type { Tables } from "@/types/database.generated";

export type AllocationSettings = Tables<"monthly_allocation_settings">;
export type AllocationExpense = Pick<Tables<"expenses">, "id" | "category_id" | "amount" | "date" | "description">;

async function loadExpenses(settings: AllocationSettings, month: string) {
  const period = getAllocationPeriod(month);
  const expenses: AllocationExpense[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const result = await supabase.from("expenses").select("id, category_id, amount, date, description")
      .eq("group_id", settings.group_id)
      .in("category_id", allocationCategories.map(({ key }) => settings[key]))
      .gte("date", period.expenseStart).lt("date", period.expenseEnd)
      .order("date").order("id").range(offset, offset + pageSize - 1);
    if (result.error) throw result.error;
    expenses.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < pageSize) return expenses;
  }
}

export async function loadMonthlyAllocation(settings: AllocationSettings, month: string) {
  const period = getAllocationPeriod(month);
  const [incomes, fixedCosts, expenses] = await Promise.all([
    supabase.from("monthly_incomes").select("id, recipient, amount")
      .eq("group_id", settings.group_id).eq("target_month", `${period.incomeMonth}-01`),
    supabase.from("monthly_fixed_costs").select("id, item, amount")
      .eq("group_id", settings.group_id).eq("target_month", `${period.expenseMonth}-01`),
    loadExpenses(settings, month),
  ]);
  if (incomes.error) throw incomes.error;
  if (fixedCosts.error) throw fixedCosts.error;
  return { incomes: incomes.data ?? [], fixedCosts: fixedCosts.data ?? [], expenses };
}

export type MonthlyAllocationData = Awaited<ReturnType<typeof loadMonthlyAllocation>>;
