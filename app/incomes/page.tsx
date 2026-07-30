"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAppContext } from "@/components/custom/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { incomeRecipients, type IncomeRecipient } from "@/types";

type IncomeFormValues = Record<IncomeRecipient, string>;

const emptyIncomeFormValues: IncomeFormValues = {
  創平: "",
  優希: "",
};

function monthToDate(month: string) {
  return `${month}-01`;
}

export default function Page() {
  const { currentGroup, loading: appLoading, session } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [incomes, setIncomes] = useState<IncomeFormValues>(emptyIncomeFormValues);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchIncomes = async (groupId: string, month: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("monthly_incomes")
      .select("id, group_id, recipient, amount, target_month, created_by, created_at, updated_at")
      .eq("group_id", groupId)
      .eq("target_month", monthToDate(month))
      .order("recipient", { ascending: true });

    if (error) {
      console.error("Error fetching monthly incomes:", error);
      setMessage("収入の読み込みに失敗しました。");
      setLoading(false);
      return;
    }

    const nextIncomes = (data ?? []).reduce<IncomeFormValues>(
      (values, income) => ({
        ...values,
        [income.recipient as IncomeRecipient]: String(income.amount),
      }),
      { ...emptyIncomeFormValues },
    );

    setIncomes(nextIncomes);
    setLoading(false);
  };

  useEffect(() => {
    if (!currentGroup?.id) {
      setIncomes(emptyIncomeFormValues);
      setLoading(false);
      return;
    }

    void fetchIncomes(currentGroup.id, selectedMonth);
  }, [currentGroup?.id, selectedMonth]);

  const saveIncomes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentGroup?.id || !session?.user.id) {
      return;
    }

    const amounts = incomeRecipients.map((recipient) => ({
      recipient,
      amount: Number(incomes[recipient]),
    }));

    if (amounts.some(({ amount }) => !Number.isInteger(amount) || amount < 0)) {
      setMessage("手取りは 0 円以上の整数で入力してください。");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const { error } = await supabase.from("monthly_incomes").upsert(
      amounts.map(({ recipient, amount }) => ({
        group_id: currentGroup.id,
        recipient,
        amount,
        target_month: monthToDate(selectedMonth),
        created_by: session.user.id,
      })),
      { onConflict: "group_id,recipient,target_month" },
    );

    if (error) {
      console.error("Error saving monthly incomes:", error);
      setMessage("収入の保存に失敗しました。");
      setIsSaving(false);
      return;
    }

    await fetchIncomes(currentGroup.id, selectedMonth);
    setMessage("収入を保存しました。");
    setIsSaving(false);
  };

  if (appLoading || loading) {
    return <div className="container mx-auto px-4 py-8">読み込み中...</div>;
  }

  if (!currentGroup) {
    return <div className="container mx-auto px-4 py-8">利用可能なグループがありません。</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">収入</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        現在のグループ: {currentGroup.name}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>月ごとの手取り</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveIncomes} className="space-y-6">
            <div>
              <Label htmlFor="income-month" className="mb-1 block text-sm font-medium text-gray-700">
                月の選択
              </Label>
              <Input
                id="income-month"
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {incomeRecipients.map((recipient) => (
                <div key={recipient}>
                  <Label htmlFor={`income-${recipient}`} className="mb-1 block text-sm font-medium text-gray-700">
                    {recipient}の手取り
                  </Label>
                  <Input
                    id={`income-${recipient}`}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="例: 300000"
                    value={incomes[recipient]}
                    onChange={(event) => {
                      setIncomes((current) => ({ ...current, [recipient]: event.target.value }));
                    }}
                    required
                  />
                </div>
              ))}
            </div>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "保存中..." : "収入を保存"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
