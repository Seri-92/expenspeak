"use client";

import React, { useEffect, useState } from "react";
import ExpenseListDisplay from "@/components/custom/ExpenseListDisplay";
import { MultiSelect, type Option } from "@/components/custom/multi-select";
import { useAppContext } from "@/components/custom/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import type { Category, Expense } from "@/types";

export default function Page() {
  const { currentGroup, loading: appLoading } = useAppContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentGroup?.id) {
        setCategories([]);
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .select("id, group_id, name, created_at, updated_at")
        .eq("group_id", currentGroup.id)
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      setCategories((data ?? []) as Category[]);
    };

    void fetchCategories();
  }, [currentGroup?.id]);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentGroup?.id) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      let query = supabase
        .from("expenses")
        .select("id, group_id, category_id, created_by, amount, description, date, created_at, updated_at, category:categories!expenses_category_group_fkey(id, name)")
        .eq("group_id", currentGroup.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: true });

      if (selectedCategories.length > 0) {
        query = query.in("category_id", selectedCategories.map(Number));
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching expenses:", error);
        setLoading(false);
        return;
      }

      const normalizedExpenses =
        data?.map((expense) => ({
          ...expense,
          category: Array.isArray(expense.category) ? expense.category[0] ?? null : expense.category,
        })) ?? [];

      setExpenses(normalizedExpenses as Expense[]);
      setLoading(false);
    };

    void fetchExpenses();
  }, [currentGroup?.id, selectedCategories, selectedMonth]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const categoryOptions: Option[] = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (appLoading || loading) {
    return <div className="container mx-auto px-4 py-8">読み込み中...</div>;
  }

  if (!currentGroup) {
    return <div className="container mx-auto px-4 py-8">利用可能なグループがありません。</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">支出一覧</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        現在のグループ: {currentGroup.name}
      </p>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>合計金額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">
              {totalExpense.toLocaleString()} 円
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>フィルター</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="month-select" className="mb-1 block text-sm font-medium text-gray-700">
                月の選択
              </Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="category-select" className="mb-1 block text-sm font-medium text-gray-700">
                カテゴリー
              </Label>
              <MultiSelect
                options={categoryOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                placeholder="カテゴリー選択"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>支出詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseListDisplay expenses={expenses} />
        </CardContent>
      </Card>
    </div>
  );
}
