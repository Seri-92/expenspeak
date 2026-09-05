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
    <form onSubmit={save} noValidate className="grid gap-3 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] sm:items-center sm:gap-x-6 sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={id} className="text-base font-semibold">{props.item}</Label>
          <span className={`rounded border px-2 py-0.5 text-xs ${dirty || !record ? "border-neutral-300 bg-neutral-100 text-neutral-800" : "border-transparent text-neutral-600"}`}>
            {dirty ? "未保存" : record ? "保存済み" : "未入力"}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          {formatMonth(month)}{props.kind === "income" ? "に受け取った手取り" : "分"}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Input id={id} type="text" inputMode="numeric" value={value} disabled={saving}
            className="h-11 border-neutral-300 bg-white pr-9 text-right text-lg font-medium tabular-nums shadow-none focus-visible:ring-neutral-500"
            aria-label={label} aria-describedby={`${id}-status`} aria-invalid={Boolean(error)} placeholder="0"
            onChange={(event) => { setValue(event.target.value); setMessage(""); setError(""); }} />
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600">円</span>
        </div>
        <Button type="submit" variant="outline" aria-label={saving ? `${label}を保存中` : saveLabel} disabled={saving || !userId}
          className="h-11 shrink-0 border-neutral-300 bg-white px-4 text-neutral-800 shadow-none hover:bg-neutral-100">
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
      <p id={`${id}-status`} className={dirty ? "text-sm text-neutral-600 sm:col-span-2" : "sr-only"}>
        {dirty ? `未保存の変更があります。集計には${record ? `保存済みの${formatYen(record.amount)}` : "未入力の状態"}が反映されています。` : "0円も入力できます。空欄は未入力です。"}
      </p>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <p role="status" className="text-sm text-neutral-600 empty:hidden sm:col-span-2">{message}</p>
    </form>
  );
}
