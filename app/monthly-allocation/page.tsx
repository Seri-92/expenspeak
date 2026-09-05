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

  return <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6 text-neutral-900 sm:py-10">
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">月次集計</h1>
      <p className="mt-2 text-sm text-neutral-600">受け取った月の手取りで、その前月の生活費を精算します。</p>
      {group && <p className="mt-2 text-sm text-neutral-600">集計対象: {group.name}</p>}
    </header>
    <section aria-label="集計する期間" className="overflow-hidden rounded-xl border border-neutral-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-6">
      <Label htmlFor="allocation-month" className="text-sm font-medium">手取りを受け取った月（集計月）</Label>
      <Input id="allocation-month" type="month" min="1900-01" max="9998-12" value={month} className="h-11 w-44 border-neutral-300 bg-white text-base shadow-none focus-visible:ring-neutral-500"
        onChange={(event) => {
          try { getAllocationPeriod(event.target.value); setMonth(event.target.value); } catch { /* 空欄などで現在の集計を変更しない */ }
        }} />
      </div>
      <div className="grid grid-cols-2 gap-4 bg-white px-4 py-5 sm:gap-6 sm:px-6">
        <div>
          <p className="text-sm font-medium">手取り <span className="ml-1 text-xs text-neutral-600">当月</span></p>
          <p className="mt-2 text-xl font-semibold">{formatMonth(month)}</p>
          <p className="mt-1 text-sm text-neutral-600">二人の収入</p>
        </div>
        <div className="border-l border-neutral-200 pl-4 sm:pl-6">
          <p className="text-sm font-medium">生活費 <span className="ml-1 rounded border border-neutral-300 px-1.5 py-0.5 text-xs">前月</span></p>
          <p className="mt-2 text-xl font-semibold">{formatMonth(expenseMonth)}</p>
          <p className="mt-1 text-sm text-neutral-600">変動費 ＋ 固定費</p>
        </div>
      </div>
      <p className="px-4 pb-4 text-sm leading-relaxed text-neutral-600 sm:px-6">生活費は自動で前月分になります。月の切り替え前に保存してください。</p>
    </section>
    {appLoading ? <p role="status">読み込み中…</p>
      : error ? <div role="alert" className="border-t border-neutral-200 py-6">
        <p>集計設定の読み込みに失敗しました。</p>
        <Button variant="outline" className="mt-3" onClick={() => setRetry((n) => n + 1)}>再読み込み</Button>
      </div>
      : !settingsList ? <p role="status">集計設定を読み込み中…</p>
      : !group ? <p>月次集計を利用するには「SSY」グループに参加してください。</p>
      : !settings ? <MonthlyAllocationSetup key={group.id} groupId={group.id} onConfigured={(item) => setSettingsList((current) => [...(current ?? []), item])} />
      : <MonthlyAllocationDetails key={settings.group_id + month} settings={settings} month={month} userId={session?.user.id ?? ""} />}
  </main>;
}
