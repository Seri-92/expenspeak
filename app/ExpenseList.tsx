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

export default function ExpenseList({ initialExpenses = [] }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>("");

  // 初回マウント時にデータを取得
  useEffect(() => {
    fetchExpenses();
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

  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://iaxrksqugrmkhmpqhxsu.supabase.co/auth/v1/callback",
      }
    })
  }

  // フォーム送信時に新規データを挿入し、その後最新データを取得
  const addExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabase
      .from("expenses")
      .insert([{
        amount: parseInt(amount),
        description,
        date
      }]);

    if (error) {
      console.error("Error adding expense:", error);
    } else {
      // 挿入成功後に最新データを取得して一覧を更新
      await fetchExpenses();
      // フォームをリセット
      setAmount("");
      setDescription("");
      setDate("");
    }
  };

  return (
    <div className="p-4">
      <Button onClick={handleLogin}>ログイン</Button>
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
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
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