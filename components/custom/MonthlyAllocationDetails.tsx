"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import MonthlyAmountEditor from "@/components/custom/MonthlyAmountEditor";
import { Button } from "@/components/ui/button";
import { allocationCategories, calculateMonthlyAllocation, calculateMonthlyTransfer, fixedCostItems, formatMonth, formatYen, getAllocationPeriod, sumExpensesByCategory } from "@/lib/monthlyAllocation";
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
  const transfer = calculateMonthlyTransfer(data.incomes.find((row) => row.recipient === "優希")?.amount ?? null, allocation.sharePerPerson);
  const missing = [
    ...incomeRecipients.filter((_, index) => !incomes[index]).map((recipient) => `${incomeLabel}の${recipient}の手取り`),
    ...fixedCostItems.filter((_, index) => !fixedCosts[index]).map((item) => `${expenseLabel}分の${item}`),
  ];

  return <div className="space-y-6">
    <section aria-label="取り分の計算結果" className="overflow-hidden rounded-xl border border-neutral-300 bg-white text-neutral-900">
      <div className="bg-neutral-50 px-4 py-5 sm:p-6">
        <h2 className="text-lg font-semibold">今回の取り分</h2>
        <p className="mb-5 mt-1 text-sm leading-relaxed text-neutral-600">{incomeLabel}の手取り − {expenseLabel}の生活費</p>
        {allocation.status === "incomplete" ? <>
          <h2 className="text-2xl font-semibold">取り分は入力待ちです</h2>
          <p className="mt-2 text-sm text-neutral-700">あと{missing.length}項目を保存すると計算できます。</p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-neutral-600">{missing.map((label) => <li key={label}>{label}</li>)}</ul>
        </> : allocation.status === "shortfall" ? <>
          <h2 className="text-lg font-medium text-neutral-900">生活費の不足額</h2>
          <p className="mt-2 text-4xl font-medium tabular-nums">{formatYen(allocation.shortfall)}</p>
          <p className="mt-3">1人あたりの負担額: {formatYen(allocation.burdenPerPerson)}</p>
          {allocation.remainder > 0 && <p className="mt-2 text-sm text-neutral-500">1円単位で切り上げています。二人が負担した後の残額は1円です。</p>}
        </> : <>
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 sm:gap-6">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-neutral-700">取り分</h3>
              <p className="mt-1 whitespace-nowrap text-sm text-neutral-600">1人あたり</p>
              <p className="mt-2 whitespace-nowrap text-2xl font-semibold tracking-tight tabular-nums sm:text-4xl">{formatYen(allocation.sharePerPerson!)}</p>
            </div>
            {transfer !== null && <div className="min-w-0 border-t border-neutral-300 pt-4 min-[400px]:border-l min-[400px]:border-t-0 min-[400px]:pl-4 min-[400px]:pt-0 sm:pl-6">
              <h3 className="text-sm font-medium text-neutral-700">送る金額</h3>
              <p className="mt-1 whitespace-nowrap text-sm text-neutral-600">{transfer > 0 ? "優希 → 創平" : transfer < 0 ? "創平 → 優希" : "送金不要"}</p>
              <p className="mt-2 whitespace-nowrap text-2xl font-semibold tracking-tight tabular-nums sm:text-4xl">{formatYen(Math.abs(transfer))}</p>
            </div>}
          </div>
          <p className="mt-4 text-sm text-neutral-600">生活費は創平が支払うため、優希の手取り − 取り分で精算します。差額が負の場合は創平から優希へ送ります。</p>
          {allocation.remainder > 0 && <p className="mt-4 text-sm text-neutral-500">1円単位で二等分した残額: {formatYen(allocation.remainder)}</p>}
        </>}
      </div>
      <div className="space-y-3 border-t border-neutral-200 px-4 py-5 sm:px-6">
        <p className="text-sm font-semibold">計算の内訳</p>
        <dl className="space-y-3 text-sm sm:text-base">
          <div className="flex justify-between gap-4"><dt>{incomeLabel}の手取り合計{incomes.some((row) => !row) ? "（入力済み分）" : ""}</dt><dd className="shrink-0 tabular-nums">{formatYen(allocation.totalIncome)}</dd></div>
          <div className="flex justify-between gap-4"><dt>差し引く {expenseLabel}の変動費</dt><dd className="shrink-0 tabular-nums">− {formatYen(allocation.variableExpense)}</dd></div>
          <div className="flex justify-between gap-4"><dt>差し引く {expenseLabel}分の固定費{fixedCosts.some((row) => !row) ? "（入力済み分）" : ""}</dt><dd className="shrink-0 tabular-nums">− {formatYen(allocation.fixedExpense)}</dd></div>
          {allocation.status === "ready" && <div className="flex justify-between gap-4 border-t border-neutral-300 pt-3 font-semibold"><dt>二人で分ける金額（÷ 2）</dt><dd className="shrink-0 tabular-nums">{formatYen(allocation.distributableAmount!)}</dd></div>}
        </dl>
        <p className="text-sm leading-relaxed text-neutral-600">保存済みの金額で計算しています。</p>
      </div>
    </section>

    <section aria-labelledby="income-heading" className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-6">
        <p className="mb-1 text-sm font-medium text-neutral-600">収入の入力 · 当月</p>
        <h2 id="income-heading" className="text-lg font-semibold">{incomeLabel}に受け取った手取り</h2>
        <p className="mt-2 text-sm text-neutral-600">一人ずつ、金額が分かったら保存できます。</p>
      </div>
      <div className="divide-y divide-neutral-200">{incomeRecipients.map((recipient, index) => <MonthlyAmountEditor
        key={recipient} kind="income" item={recipient} groupId={settings.group_id} month={month} userId={userId} record={incomes[index]}
        onSaved={(record) => setData((current) => current && ({ ...current, incomes: [...current.incomes.filter((row) => row.recipient !== recipient), { ...record, recipient }] }))} />)}</div>
    </section>

    <section aria-labelledby="expenses-heading" className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-6">
        <p className="mb-1 text-sm font-medium text-neutral-600">生活費の内訳 · 前月 / 自動集計</p>
        <h2 id="expenses-heading" className="text-lg font-semibold">{expenseLabel}の変動費</h2>
        <p className="mt-2 text-sm text-neutral-600">{expenseLabel}1日〜月末の支出です。項目を開くと明細を確認できます。</p>
      </div>
      <div className="divide-y divide-neutral-200">{allocationCategories.map(({ key, label }) => {
        const rows = data.expenses.filter((row) => row.category_id === settings[key]);
        return <details key={key} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-500 sm:px-6 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium sm:text-base">{label}の明細</span><span className="mt-1 block text-sm text-neutral-600">{rows.length}件</span></span>
            <span className="shrink-0 text-base font-semibold tabular-nums">{formatYen(totals[settings[key]])}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-open:rotate-180" />
          </summary>
          {rows.length ? <ul className="mx-4 divide-y border-t text-sm sm:mx-6">{rows.map((row) => <li key={row.id} className="flex justify-between gap-3 py-3">
            <div className="min-w-0"><p className="text-xs text-neutral-500">{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }).format(new Date(row.date))}</p><p className="mt-1 break-words">{row.description || "メモなし"}</p></div>
            <span className="shrink-0 tabular-nums">{formatYen(row.amount)}</span>
          </li>)}</ul> : <p className="px-4 pb-4 text-sm text-neutral-600 sm:px-6">{expenseLabel}の対象支出はありません。</p>}
        </details>;
      })}</div>
      <p className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 text-right text-sm font-semibold sm:px-6">{expenseLabel}の変動費合計: {formatYen(allocation.variableExpense)}</p>
    </section>

    <section aria-labelledby="fixed-heading" className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-6">
        <p className="mb-1 text-sm font-medium text-neutral-600">生活費の入力 · 前月</p>
        <h2 id="fixed-heading" className="text-lg font-semibold">{expenseLabel}分の固定費</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">支払日ではなく、{expenseLabel}分の費用を入力します。請求がない項目は0円を保存してください。</p>
      </div>
      <div className="divide-y divide-neutral-200">{fixedCostItems.map((item, index) => <MonthlyAmountEditor
        key={item} kind="fixed" item={item} groupId={settings.group_id} month={expenseMonth} userId={userId} record={fixedCosts[index]}
        onSaved={(record) => setData((current) => current && ({ ...current, fixedCosts: [...current.fixedCosts.filter((row) => row.item !== item), { ...record, item }] }))} />)}</div>
      <p className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 text-right text-sm font-semibold sm:px-6">{expenseLabel}分の固定費合計{fixedCosts.some((row) => !row) ? "（入力済み分）" : ""}: {formatYen(allocation.fixedExpense)}</p>
    </section>
    <details className="text-sm text-neutral-600">
      <summary className="cursor-pointer py-2 font-medium">集計・入力について</summary>
      <ul className="mt-2 list-inside list-disc space-y-2 leading-relaxed">
        <li>固定費は専用の入力欄で管理します。対象3分類の支出にも同じ費用を登録すると、二重に差し引かれます。</li>
        <li>別の端末での更新はページを再読み込みすると反映されます。</li>
      </ul>
    </details>
  </div>;
}
