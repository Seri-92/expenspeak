"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/components/custom/AppContext";
import MonthlyAllocationDetails from "@/components/custom/MonthlyAllocationDetails";
import MonthlyAllocationSetup from "@/components/custom/MonthlyAllocationSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonth, getAllocationPeriod, getCurrentMonth } from "@/lib/monthlyAllocation";
import type { AllocationSettings } from "@/lib/monthlyAllocationData";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  const { groups, loading: appLoading, session } = useAppContext();
  const [month, setMonth] = useState(getCurrentMonth);
  const [settingsList, setSettingsList] = useState<AllocationSettings[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const membershipKey = groups.map((group) => group.id).sort().join(",");
  useEffect(() => {
    if (appLoading) return;
    let active = true;
    setError(false);
    setSettingsList(null);
    async function load() {
      try {
        const result = await supabase.from("monthly_allocation_settings").select("*").order("created_at");
        if (result.error) throw result.error;
        if (active) setSettingsList(result.data ?? []);
      } catch {
        if (active) setError(true);
      }
    }
    void load();
    return () => { active = false; };
  }, [appLoading, membershipKey, retry]);

  const settings = settingsList?.find((item) => groups.some((group) => group.id === item.group_id && group.name === "SSY"))
    ?? settingsList?.find((item) => groups.some((group) => group.id === item.group_id));
  const group = settings ? groups.find((item) => item.id === settings.group_id) : groups.find((item) => item.name === "SSY");
  const { expenseMonth } = getAllocationPeriod(month);

  return <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10">
    <header>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">月次集計</h1>
      <p className="mt-2 text-sm text-slate-600">受け取った月の手取りで、その前月の生活費を精算します。</p>
      {group && <p className="mt-2 text-sm font-medium">集計対象: {group.name}</p>}
    </header>
    <section aria-label="集計する期間" className="rounded-2xl border bg-white p-4 sm:p-6">
      <Label htmlFor="allocation-month" className="text-base font-medium">手取りを受け取った月（集計月）</Label>
      <Input id="allocation-month" type="month" min="1900-01" max="9998-12" value={month} className="mt-2 max-w-xs"
        onChange={(event) => {
          try { getAllocationPeriod(event.target.value); setMonth(event.target.value); } catch { /* 空欄などで現在の集計を変更しない */ }
        }} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold text-sky-800">収入 · 選択した月</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatMonth(month)}</p>
          <p className="mt-1 text-sm text-slate-600">この月に受け取った二人の手取り</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800">差し引く生活費 · 前月</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatMonth(expenseMonth)}</p>
          <p className="mt-1 text-sm text-slate-600">この月の変動費 ＋ この月分の固定費</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">生活費の月は自動で前月になります。月を切り替える前に、入力した金額を保存してください。</p>
    </section>
    {appLoading ? <p role="status">読み込み中…</p>
      : error ? <div role="alert" className="rounded-xl border border-red-200 p-6">
        <p>集計設定の読み込みに失敗しました。</p>
        <Button variant="outline" className="mt-3" onClick={() => setRetry((n) => n + 1)}>再読み込み</Button>
      </div>
      : !settingsList ? <p role="status">集計設定を読み込み中…</p>
      : !group ? <p>月次集計を利用するには「SSY」グループに参加してください。</p>
      : !settings ? <MonthlyAllocationSetup key={group.id} groupId={group.id} onConfigured={(item) => setSettingsList((current) => [...(current ?? []), item])} />
      : <MonthlyAllocationDetails key={settings.group_id + month} settings={settings} month={month} userId={session?.user.id ?? ""} />}
  </main>;
}
