"use client";

import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonth, formatYen, parseMonthlyAmount, type FixedCostItem } from "@/lib/monthlyAllocation";
import { supabase } from "@/lib/supabaseClient";
import type { IncomeRecipient } from "@/types";

export type AmountRecord = { id: string; amount: number };
type Props = {
  groupId: string;
  month: string;
  userId: string;
  record: AmountRecord | null;
  onSaved: (record: AmountRecord) => void;
} & ({ kind: "income"; item: IncomeRecipient } | { kind: "fixed"; item: FixedCostItem });

export default function MonthlyAmountEditor(props: Props) {
  const { groupId, month, userId, record, onSaved } = props;
  const id = useId();
  const [value, setValue] = useState(record ? String(record.amount) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const label = props.kind === "income"
    ? `${formatMonth(month)}の${props.item}の手取り`
    : `${formatMonth(month)}分の${props.item}`;
  const saveLabel = props.kind === "income"
    ? `${props.item}の${formatMonth(month)}の手取りを保存`
    : `${label}を保存`;
  const dirty = value !== (record ? String(record.amount) : "");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || !userId) return;
    setError("");
    setMessage("");
    let amount: number | null;
    try {
      amount = parseMonthlyAmount(value);
      if (amount === null) throw new Error("金額を入力してください。請求がない場合は0円を入力してください。");
    } catch (cause) {
      setError((cause as Error).message);
      return;
    }
    setSaving(true);
    try {
      const common = { group_id: groupId, target_month: `${month}-01`, amount, created_by: userId };
      const query = record
        ? supabase.from(props.kind === "income" ? "monthly_incomes" : "monthly_fixed_costs")
          .update({ amount }).eq("id", record.id).eq("group_id", groupId).eq("target_month", `${month}-01`)
        : props.kind === "income"
          ? supabase.from("monthly_incomes").insert({ ...common, recipient: props.item })
          : supabase.from("monthly_fixed_costs").insert({ ...common, item: props.item });
      const result = await query.select("id, amount").single();
      if (result.error || !result.data) throw result.error ?? new Error("保存結果がありません。");
      onSaved(result.data);
      setValue(String(result.data.amount));
      setMessage(`${label}を保存しました。`);
    } catch {
      setError("保存に失敗しました。入力内容を確認して再度保存してください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-3 border-t border-neutral-200 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-neutral-500">
          {record ? `保存済み ${formatYen(record.amount)}` : "未入力"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input id={id} type="text" inputMode="numeric" value={value} disabled={saving}
          className="border-neutral-300 bg-white shadow-none focus-visible:ring-neutral-400"
          aria-describedby={`${id}-status`} aria-invalid={Boolean(error)} placeholder="例: 300000"
          onChange={(event) => { setValue(event.target.value); setMessage(""); setError(""); }} />
        <span className="text-sm text-muted-foreground">円</span>
      </div>
      <p id={`${id}-status`} className="text-xs text-muted-foreground">
        {dirty ? "未保存の変更があります。集計には保存済みの金額を使用します。" : "0円も入力できます。空欄は未入力です。"}
      </p>
      <Button type="submit" variant="outline" disabled={saving || !userId} className="h-auto w-full whitespace-normal border-neutral-300 bg-white py-2 text-neutral-700 shadow-none hover:bg-neutral-50">
        {saving ? "保存中…" : saveLabel}
      </Button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p role="status" className="text-sm text-neutral-600">{message}</p>
    </form>
  );
}
