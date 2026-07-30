"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/components/custom/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateMonthlyAllocation, type MonthlyAllocation } from "@/lib/monthlyAllocation";
import { supabase } from "@/lib/supabaseClient";
import type { IncomeRecipient } from "@/types";

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));

  return { start: start.toISOString(), end: end.toISOString() };
}

function formatYen(amount: number) {
  return `${amount.toLocaleString()} 円`;
}

export default function Page() {
  const { groups, loading: appLoading } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [allocation, setAllocation] = useState<MonthlyAllocation | null>(null);
  const [incomes, setIncomes] = useState<Record<IncomeRecipient, number | null>>({
    創平: null,
    優希: null,
  });
  const [loading, setLoading] = useState(true);
  const ssyGroup = groups.find((group) => group.name === "SSY");
  const ssyGroupId = ssyGroup?.id;

  useEffect(() => {
    const fetchAllocation = async () => {
      if (!ssyGroupId) {
        setAllocation(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { start, end } = getMonthRange(selectedMonth);
      const [incomeResult, expenseResult] = await Promise.all([
        supabase
          .from("monthly_incomes")
          .select("recipient, amount")
          .eq("group_id", ssyGroupId)
          .eq("target_month", `${selectedMonth}-01`)
          .order("recipient", { ascending: true }),
        supabase
          .from("expenses")
          .select("amount, category:categories!expenses_category_group_fkey(name)")
          .eq("group_id", ssyGroupId)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true }),
      ]);

      if (incomeResult.error || expenseResult.error) {
        console.error("Error fetching monthly allocation:", incomeResult.error ?? expenseResult.error);
        setAllocation(null);
        setLoading(false);
        return;
      }

      const nextIncomes: Record<IncomeRecipient, number | null> = { 創平: null, 優希: null };
      for (const income of incomeResult.data ?? []) {
        nextIncomes[income.recipient as IncomeRecipient] = income.amount;
      }

      const nonDateExpense = (expenseResult.data ?? []).reduce((total, expense) => {
        const category = Array.isArray(expense.category) ? expense.category[0] : expense.category;
        return category?.name === "デート" ? total : total + expense.amount;
      }, 0);

      setIncomes(nextIncomes);
      setAllocation(
        calculateMonthlyAllocation({
          soheiIncome: nextIncomes.創平,
          yukiIncome: nextIncomes.優希,
          nonDateExpense,
        }),
      );
      setLoading(false);
    };

    void fetchAllocation();
  }, [selectedMonth, ssyGroupId]);

  if (appLoading || loading) {
    return <div className="container mx-auto px-4 py-8">読み込み中...</div>;
  }

  if (!ssyGroup) {
    return (
      <div className="container mx-auto px-4 py-8">
        取り分を計算するには「SSY」グループに参加してください。
      </div>
    );
  }

  if (!allocation) {
    return <div className="container mx-auto px-4 py-8">取り分の読み込みに失敗しました。</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">月ごとの取り分</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        SSY の手取り合計から、分類が「デート」以外の支出を引いて二等分します。
      </p>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Label htmlFor="allocation-month" className="mb-1 block text-sm font-medium text-gray-700">
            月の選択
          </Label>
          <Input
            id="allocation-month"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>創平の手取り</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{incomes.創平 === null ? "未入力" : formatYen(incomes.創平)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>優希の手取り</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{incomes.優希 === null ? "未入力" : formatYen(incomes.優希)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>デート以外の支出</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatYen(allocation.nonDateExpense)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>二人の取り分</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-primary">各 {formatYen(allocation.sharePerPerson)}</p></CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>計算式</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          ({formatYen(allocation.totalIncome)} − {formatYen(allocation.nonDateExpense)}) ÷ 2 = 各 {formatYen(allocation.sharePerPerson)}
        </CardContent>
      </Card>
    </div>
  );
}
