"use client";
import ExpenseListDisplay from '@/components/custom/ExpenseListDisplay'
import { supabase } from '@/lib/supabaseClient';
import React, { useEffect, useState } from 'react'
import { Category, Expense, ExpenseCategory } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect, type Option } from '@/components/custom/multi-select';

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // カテゴリー一覧を取得
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedCategories]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching categories:", error);
    } else if (data) {
      setCategories(data as Category[]);
    }
    console.log(data);
  }

  const fetchExpenses = async () => {
    // selectedMonth から月初・月末を計算(GMT+9)
    const [year, month] = selectedMonth.split("-").map(Number);

    // 東京時間 (UTC+9) における月初と月末の計算
    const startDate = new Date(year, month - 1, 1, 0, 0, 0); // JSTの月初 00:00:00
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // JSTの月末 23:59:59.999

    // ISO形式にするためにUTCの時差（-9時間）を調整
    const startDateISO = new Date(startDate.getTime() - 9 * 60 * 60 * 1000).toISOString();
    const endDateISO = new Date(endDate.getTime() - 9 * 60 * 60 * 1000).toISOString();

    let expenseIds: string[] = [];
    // 選択されたカテゴリーがある場合、expense_categories から expense_id を取得
    if (selectedCategories.length > 0) {
      const { data: ecData, error: ecError } = await supabase
        .from("expense_categories")
        .select("expense_id")
        .in("category_id", selectedCategories.map(Number));
      if (ecError) {
        console.error("Error fetching expense_categories:", ecError);
      } else if (ecData) {
        expenseIds = ecData.map((item) => item.expense_id);
      }
    }

    let query = supabase
      .from("expenses")
      .select(`
        *,
        expense_categories ( category_id )
      `)
      .gte("date", startDateISO)
      .lte("date", endDateISO)
      .order("date", { ascending: true });

    // expense_ids で絞り込み
    if (selectedCategories.length > 0) {
      query = query.in("id", expenseIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching expenses:", error);
    } else if (data) {
      setExpenses(data);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  // カテゴリー情報を MultiSelect の Option 型に変換（id を文字列に）
  const categoryOptions: Option[] = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  // 絞り込み後の expense の合計金額を計算
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div>
      <h1 className='text-2xl font-bold p-6'>支出一覧</h1>
      <div className='p-4 mt-4'>
        <h2 className='text-xl font-semibold'>合計金額: {totalExpense.toLocaleString()} 円</h2>
      </div>
      <div className='p-4'>
        <Label htmlFor='month-select' className='text-xl mr-4'>
          月の選択
          <Input
            id='month-select'
            type='month'
            value={selectedMonth}
            onChange={handleMonthChange}
            className='w-40'
          />
        </Label>
      </div>
      <div className='p-4'>
        <h2 className='text-xl'>カテゴリー</h2>
        <MultiSelect
          options={categoryOptions}
          selected={selectedCategories}
          onChange={setSelectedCategories}
          placeholder='カテゴリー選択'
        />
      </div>
      <ExpenseListDisplay expenses={expenses} />
    </div>
  )
}