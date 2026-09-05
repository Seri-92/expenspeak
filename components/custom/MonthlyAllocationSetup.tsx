"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { allocationCategories } from "@/lib/monthlyAllocation";
import type { AllocationSettings } from "@/lib/monthlyAllocationData";
import { supabase } from "@/lib/supabaseClient";

export default function MonthlyAllocationSetup({ groupId, onConfigured }: {
  groupId: string; onConfigured: (settings: AllocationSettings) => void;
}) {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await supabase.from("categories").select("id, name").eq("group_id", groupId).order("id");
        if (result.error) throw result.error;
        if (active) {
          const rows = result.data ?? [];
          setCategories(rows);
          setSelection(Object.fromEntries(allocationCategories.map(({ key, label }) => [key, String(rows.find((row) => row.name === label)?.id ?? "")])));
        }
      } catch {
        if (active) setError("分類の読み込みに失敗しました。");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [groupId, retry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const ids = allocationCategories.map(({ key }) => Number(selection[key]));
    if (ids.some((id) => !categories.some((category) => category.id === id)) || new Set(ids).size !== 3) {
      setError("3項目それぞれに、異なる分類を選択してください。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await supabase.from("monthly_allocation_settings").insert({
        group_id: groupId, food_category_id: ids[0], supplies_category_id: ids[1], work_category_id: ids[2],
      }).select("*").single();
      if (result.error || !result.data) throw result.error ?? new Error("保存できませんでした。");
      onConfigured(result.data);
    } catch {
      setError("設定を保存できませんでした。再度保存するか、ページを再読み込みしてください。");
    } finally {
      setSaving(false);
    }
  }

  return <section className="space-y-4 rounded-xl border bg-white p-6">
    <h2 className="text-xl font-semibold">集計する分類の初期設定</h2>
    <p className="text-sm text-muted-foreground">SSYの支出から、生活費として差し引く3つの分類を選んでください。設定は翌月以降も使用します。</p>
    {loading ? <p role="status">分類を読み込み中…</p> : <form onSubmit={save} className="space-y-4">
      {allocationCategories.map(({ key, label }) => <div key={key}>
        <Label htmlFor={key}>{label}として集計する分類</Label>
        <select id={key} className="mt-1 block w-full rounded-md border bg-white p-2" value={selection[key] ?? ""}
          disabled={saving} onChange={(event) => setSelection((current) => ({ ...current, [key]: event.target.value }))}>
          <option value="">分類を選択</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>)}
      <Button disabled={saving || !categories.length} type="submit">{saving ? "保存中…" : "この3分類で集計を始める"}</Button>
      <p className="text-sm text-muted-foreground">分類が不足している場合は、管理者が<Link href="/admin" className="underline">管理画面</Link>でSSYに分類を追加してください。</p>
    </form>}
    {error && <div role="alert" className="space-y-2 text-sm text-red-700"><p>{error}</p><Button variant="outline" onClick={() => setRetry((n) => n + 1)}>分類を再読み込み</Button></div>}
  </section>;
}
