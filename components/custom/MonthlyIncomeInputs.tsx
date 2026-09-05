"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import MonthlyAmountEditor, { type AmountRecord } from "@/components/custom/MonthlyAmountEditor";
import { supabase } from "@/lib/supabaseClient";
import { incomeRecipients, type IncomeRecipient } from "@/types";

export default function MonthlyIncomeInputs({ groupId, month, userId }: { groupId: string; month: string; userId: string }) {
  const [records, setRecords] = useState<Partial<Record<IncomeRecipient, AmountRecord>> | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setError(false);
      try {
        const result = await supabase.from("monthly_incomes").select("id, recipient, amount")
          .eq("group_id", groupId).eq("target_month", `${month}-01`).order("recipient");
        if (result.error) throw result.error;
        if (active) setRecords(Object.fromEntries((result.data ?? []).map((row) => [row.recipient, row])));
      } catch {
        if (active) setError(true);
      }
    }
    void load();
    return () => { active = false; };
  }, [groupId, month, retry]);
  if (error) return <div role="alert">収入の読み込みに失敗しました。<Button variant="outline" onClick={() => setRetry((n) => n + 1)}>再読み込み</Button></div>;
  if (!records) return <p role="status">収入を読み込み中…</p>;
  return <div className="grid gap-4 sm:grid-cols-2">
    {incomeRecipients.map((recipient) => <MonthlyAmountEditor key={recipient} kind="income" item={recipient}
      groupId={groupId} month={month} userId={userId} record={records[recipient] ?? null}
      onSaved={(record) => setRecords((current) => ({ ...current, [recipient]: record }))} />)}
  </div>;
}
