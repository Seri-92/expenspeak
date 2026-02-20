"use client";
import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "../lib/supabaseClient";
import ExpenseListDisplay from "@/components/custom/ExpenseListDisplay";

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
}

interface ExpenseListProps {
  initialExpenses?: Expense[];
}

interface Category {
  id: number;
  name: string;
}

export default function ExpenseList({ initialExpenses = [] }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // 初回マウント時にデータを取得
  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
    } else if (data) {
      setExpenses(data as Expense[]);
    };
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
    } else if (data) {
      setCategories(data as Category[]);
    }
  };

  async function handleLogin() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      }
    })
  }

  // フォーム送信時に新規データを挿入し、その後最新データを取得
  const addExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert([{
        amount: parseInt(amount),
        description,
        date
      }])
      .select("id");

    if (expenseError) {
      console.error("Error adding expense:", expenseError);
      return;
    }

    if (expenseData && selectedCategory) {
      const { error: categoryError } = await supabase
        .from("expense_categories")
        .insert([{
          expense_id: expenseData[0].id,
          category_id: selectedCategory,
        }]);
  
      if (categoryError) {
        console.error("Error linking category:", categoryError);
      }
    }
      await fetchExpenses();
      setAmount("");
      setDescription("");
      setDate("");
      setSelectedCategory(null);
  };


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">支出一覧</h1>
      <ExpenseListDisplay expenses={expenses} limit={3} />

      <h2 className="text-xl font-semibold mt-8 mb-4">支出を追加</h2>
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
        <Select onValueChange={(value) => setSelectedCategory(parseInt(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="分類を選択" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category: Category) => (
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
        <Button type="submit">追加</Button>
      </form>
    </div>
  );
}
