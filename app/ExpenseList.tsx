"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "../lib/supabaseClient";

export default function ExpenseList({ initialExpenses = [] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const addExpense = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase
      .from("expenses")
      .insert([{ amount: parseInt(amount), description, date }])
      .select();  // 挿入したデータを取得してレスポンスとして返す

    if (error) {
      console.error("Error adding expense:", error);
    } else {
      setExpenses([...expenses, ...data]);  // 新しい支出を現在のexpensesに追加
      setAmount("");
      setDescription("");
      setDate("");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">支出一覧</h1>
      <div className="grid gap-4">
        {expenses.map((expense) => (
          <Card key={expense.id}>
            <CardHeader>
              <CardTitle>
                {new Date(expense.date).toLocaleDateString()}: ¥{expense.amount}
              </CardTitle>
            </CardHeader>
            <CardContent>{expense.description}</CardContent>
          </Card>
        ))}
      </div>

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
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
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