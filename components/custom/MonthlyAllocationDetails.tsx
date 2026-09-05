"use client";

import { useEffect, useState } from "react";
import MonthlyAmountEditor from "@/components/custom/MonthlyAmountEditor";
import { Button } from "@/components/ui/button";
import { allocationCategories, calculateMonthlyAllocation, fixedCostItems, formatMonth, formatYen, getAllocationPeriod, sumExpensesByCategory } from "@/lib/monthlyAllocation";
import { loadMonthlyAllocation, type AllocationSettings, type MonthlyAllocationData } from "@/lib/monthlyAllocationData";
import { incomeRecipients } from "@/types";

export default function MonthlyAllocationDetails({ settings, month, userId }: {
  settings: AllocationSettings; month: string; userId: string;
}) {
  const [data, setData] = useState<MonthlyAllocationData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const { expenseMonth } = getAllocationPeriod(month);
  const incomeLabel = formatMonth(month);
  const expenseLabel = formatMonth(expenseMonth);
  useEffect(() => {
    let active = true;
    setError(false);
    loadMonthlyAllocation(settings, month).then((result) => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [settings, month, retry]);

  if (error) return <div role="alert" className="border-t border-neutral-200 py-6">
    <p>集計の読み込みに失敗しました。収入や生活費を0円として扱わず、計算を停止しています。</p>
    <Button className="mt-3" variant="outline" onClick={() => setRetry((n) => n + 1)}>再読み込み</Button>
  </div>;
  if (!data) return <p role="status" className="py-8">{incomeLabel}の手取りと{expenseLabel}の生活費を読み込み中…</p>;

  const incomes = incomeRecipients.map((recipient) => data.incomes.find((row) => row.recipient === recipient) ?? null);
  const fixedCosts = fixedCostItems.map((item) => data.fixedCosts.find((row) => row.item === item) ?? null);
  const totals = sumExpensesByCategory(data.expenses, allocationCategories.map(({ key }) => settings[key]));
  const allocation = calculateMonthlyAllocation({
    incomes: incomes.map((row) => row?.amount ?? null), fixedCosts: fixedCosts.map((row) => row?.amount ?? null),
    variableExpense: Object.values(totals).reduce((sum, amount) => sum + amount, 0),
  });
  const missing = [
    ...incomeRecipients.filter((_, index) => !incomes[index]).map((recipient) => `${incomeLabel}の${recipient}の手取り`),
    ...fixedCostItems.filter((_, index) => !fixedCosts[index]).map((item) => `${expenseLabel}分の${item}`),
  ];

  return <div className="space-y-10">
    <section aria-label="取り分の計算結果" className="border-b border-neutral-200 bg-white pb-8 text-neutral-900">
      <div className="pb-6">
        <p className="mb-4 text-sm text-neutral-500">{incomeLabel}の手取り − {expenseLabel}の生活費</p>
        {allocation.status === "incomplete" ? <>
          <h2 className="text-2xl font-semibold">取り分は入力待ちです</h2>
          <p className="mt-2 text-sm text-neutral-500">あと{missing.length}項目を保存すると計算できます。</p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-neutral-600">{missing.map((label) => <li key={label}>{label}</li>)}</ul>
        </> : allocation.status === "shortfall" ? <>
          <h2 className="text-lg font-medium text-neutral-900">生活費の不足額</h2>
          <p className="mt-2 text-4xl font-medium tabular-nums">{formatYen(allocation.shortfall)}</p>
          <p className="mt-3">1人あたりの負担額: {formatYen(allocation.burdenPerPerson)}</p>
          {allocation.remainder > 0 && <p className="mt-2 text-sm text-neutral-500">1円単位で切り上げています。二人が負担した後の残額は1円です。</p>}
        </> : <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {incomeRecipients.map((recipient) => <div key={recipient}>
              <h2 className="text-sm text-neutral-500">{recipient}の取り分</h2>
              <p className="mt-2 text-4xl font-medium tracking-tight tabular-nums">{formatYen(allocation.sharePerPerson!)}</p>
            </div>)}
          </div>
          {allocation.remainder > 0 && <p className="mt-4 text-sm text-neutral-500">1円単位で二等分した残額: {formatYen(allocation.remainder)}</p>}
        </>}
      </div>
      <div className="space-y-4 border-t border-neutral-200 pt-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt>{incomeLabel}の手取り合計{incomes.some((row) => !row) ? "（入力済み分）" : ""}</dt><dd className="shrink-0 tabular-nums">{formatYen(allocation.totalIncome)}</dd></div>
          <div className="flex justify-between gap-4"><dt>差し引く {expenseLabel}の変動費</dt><dd className="shrink-0 tabular-nums">− {formatYen(allocation.variableExpense)}</dd></div>
          <div className="flex justify-between gap-4"><dt>差し引く {expenseLabel}分の固定費{fixedCosts.some((row) => !row) ? "（入力済み分）" : ""}</dt><dd className="shrink-0 tabular-nums">− {formatYen(allocation.fixedExpense)}</dd></div>
          {allocation.status === "ready" && <div className="flex justify-between gap-4 border-t border-neutral-200 pt-3 font-semibold"><dt>二人で分ける金額（÷ 2）</dt><dd className="shrink-0 tabular-nums">{formatYen(allocation.distributableAmount!)}</dd></div>}
        </dl>
        <p className="text-xs leading-relaxed text-neutral-500">現在の登録内容での計算です。入力欄の変更は保存後に反映されます。別の端末での更新はページを再読み込みすると反映されます。</p>
      </div>
    </section>

    <section aria-labelledby="income-heading">
      <p className="mb-1 text-xs font-medium text-neutral-500">収入 · 選択した月</p>
      <h2 id="income-heading" className="text-xl font-semibold">{incomeLabel}に受け取った手取り</h2>
      <p className="mb-5 mt-2 text-sm text-neutral-600">それぞれの金額が分かったタイミングで、個別に保存できます。</p>
      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">{incomeRecipients.map((recipient, index) => <MonthlyAmountEditor
        key={recipient} kind="income" item={recipient} groupId={settings.group_id} month={month} userId={userId} record={incomes[index]}
        onSaved={(record) => setData((current) => current && ({ ...current, incomes: [...current.incomes.filter((row) => row.recipient !== recipient), { ...record, recipient }] }))} />)}</div>
    </section>

    <section aria-labelledby="expenses-heading">
      <p className="mb-1 text-xs font-medium text-neutral-500">生活費 · 選択した月の前月</p>
      <h2 id="expenses-heading" className="text-xl font-semibold">{expenseLabel}の変動費</h2>
      <p className="mb-5 mt-2 text-sm text-neutral-600">{expenseLabel}1日〜月末の対象3分類の支出を自動で合計します。</p>
      <div className="divide-y divide-neutral-200 border-y border-neutral-200">{allocationCategories.map(({ key, label }) => {
        const rows = data.expenses.filter((row) => row.category_id === settings[key]);
        return <details key={key} className="py-4">
          <summary className="cursor-pointer text-sm font-medium"><span>{label}の明細（{rows.length}件）</span><span className="ml-3 inline-block font-semibold tabular-nums">{formatYen(totals[settings[key]])}</span></summary>
          {rows.length ? <ul className="mt-3 divide-y text-sm">{rows.map((row) => <li key={row.id} className="flex justify-between gap-3 py-3">
            <div className="min-w-0"><p className="text-xs text-neutral-500">{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }).format(new Date(row.date))}</p><p className="mt-1 break-words">{row.description || "メモなし"}</p></div>
            <span className="shrink-0 tabular-nums">{formatYen(row.amount)}</span>
          </li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{expenseLabel}の対象支出はありません。</p>}
        </details>;
      })}</div>
      <p className="mt-4 text-right text-sm font-medium">{expenseLabel}の変動費合計: {formatYen(allocation.variableExpense)}</p>
    </section>

    <section aria-labelledby="fixed-heading">
      <p className="mb-1 text-xs font-medium text-neutral-500">生活費 · 選択した月の前月</p>
      <h2 id="fixed-heading" className="text-xl font-semibold">{expenseLabel}分の固定費</h2>
      <p className="mb-5 mt-2 text-sm leading-relaxed text-neutral-600">ここには{expenseLabel}分として負担する金額を入力してください。支払日ではなく、何月分の費用かで記録します。請求がない項目は0円を保存してください。</p>
      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">{fixedCostItems.map((item, index) => <MonthlyAmountEditor
        key={item} kind="fixed" item={item} groupId={settings.group_id} month={expenseMonth} userId={userId} record={fixedCosts[index]}
        onSaved={(record) => setData((current) => current && ({ ...current, fixedCosts: [...current.fixedCosts.filter((row) => row.item !== item), { ...record, item }] }))} />)}</div>
      <p className="mt-4 text-right text-sm font-medium">{expenseLabel}分の固定費合計{fixedCosts.some((row) => !row) ? "（入力済み分）" : ""}: {formatYen(allocation.fixedExpense)}</p>
      <p className="mt-2 text-sm text-neutral-600">固定費はこの欄で管理します。上の対象3分類の支出にも同じ費用を登録すると、二重に差し引かれます。</p>
    </section>
  </div>;
}
