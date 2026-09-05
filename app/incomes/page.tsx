"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/components/custom/AppContext";
import MonthlyIncomeInputs from "@/components/custom/MonthlyIncomeInputs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonth, getAllocationPeriod, getCurrentMonth } from "@/lib/monthlyAllocation";

export default function Page() {
  const { currentGroup, loading, session } = useAppContext();
  const [month, setMonth] = useState(getCurrentMonth);
  if (loading) return <div className="container mx-auto px-4 py-8">読み込み中…</div>;
  if (!currentGroup) return <div className="container mx-auto px-4 py-8">利用可能なグループがありません。</div>;
  return <main className="container mx-auto max-w-3xl space-y-8 px-4 py-8 text-neutral-900 sm:py-12">
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">収入</h1>
      <p className="mt-2 text-sm text-muted-foreground">現在のグループ: {currentGroup.name}</p>
    </header>
    <section className="space-y-5 border-t border-neutral-200 pt-6">
      <div>
        <Label htmlFor="income-month">手取りを受け取った月</Label>
        <Input id="income-month" type="month" min="1900-01" max="9998-12" value={month} className="mt-2 max-w-xs border-neutral-300 bg-white shadow-none focus-visible:ring-neutral-400"
          onChange={(event) => {
            try { getAllocationPeriod(event.target.value); setMonth(event.target.value); } catch { /* 不正な月は反映しない */ }
          }} />
      </div>
      <h2 className="text-xl font-semibold">{formatMonth(month)}に受け取った手取り</h2>
      <p className="text-sm text-neutral-600">一人ずつ、金額が分かったタイミングで保存できます。月を切り替える前に保存してください。</p>
      <MonthlyIncomeInputs key={currentGroup.id + month} groupId={currentGroup.id} month={month} userId={session?.user.id ?? ""} />
    </section>
    <Link href="/monthly-allocation" className="inline-block text-sm underline underline-offset-4">月次集計で取り分を確認する</Link>
  </main>;
}
