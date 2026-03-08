"use client";

import { useEffect, useState } from "react";
import ExpenseListDisplay from "@/components/custom/ExpenseListDisplay";
import { useAppContext } from "@/components/custom/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import type { Category, Expense } from "@/types";

export default function ExpenseList() {
  const { currentGroup, loading: appLoading, session } = useAppContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async (groupId: string) => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, group_id, name, created_at, updated_at")
      .eq("group_id", groupId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    setCategories((data ?? []) as Category[]);
  };

  const fetchExpenses = async (groupId: string) => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, group_id, category_id, created_by, amount, description, date, created_at, updated_at, category:categories!expenses_category_group_fkey(id, name)")
      .eq("group_id", groupId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
      return;
    }

    const normalizedExpenses =
      data?.map((expense) => ({
        ...expense,
        category: Array.isArray(expense.category) ? expense.category[0] ?? null : expense.category,
      })) ?? [];

    setExpenses(normalizedExpenses as Expense[]);
  };

  useEffect(() => {
    const syncGroupData = async () => {
      if (!currentGroup?.id) {
        setExpenses([]);
        setCategories([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchExpenses(currentGroup.id),
        fetchCategories(currentGroup.id),
      ]);
      setLoading(false);
    };

    void syncGroupData();
  }, [currentGroup?.id]);

  const addExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentGroup?.id || !selectedCategory || !session?.user.id) {
      return;
    }

    const { error } = await supabase.from("expenses").insert([
      {
        amount: Number(amount),
        category_id: selectedCategory,
        created_by: session.user.id,
        date: new Date(date).toISOString(),
        description,
        group_id: currentGroup.id,
      },
    ]);

    if (error) {
      console.error("Error adding expense:", error);
      return;
    }

    await fetchExpenses(currentGroup.id);
    setAmount("");
    setDescription("");
    setDate("");
    setSelectedCategory(null);
  };

  if (appLoading || loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (!currentGroup) {
    return <div className="p-4">利用可能なグループがありません。</div>;
  }

  return (
    <div className="p-4">
      <h1 className="mb-2 text-2xl font-bold">支出一覧</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        現在のグループ: {currentGroup.name}
      </p>
      <ExpenseListDisplay expenses={expenses} limit={3} />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>支出を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addExpense} className="space-y-4">
            <Input
              type="number"
              placeholder="金額"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              type="date"
              placeholder="日付"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Select
              value={selectedCategory?.toString()}
              onValueChange={(value) => setSelectedCategory(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="分類を選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="説明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <Button type="submit" disabled={categories.length === 0}>
              追加
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
