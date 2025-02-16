"use client";
import ExpenseListDisplay from '@/components/custom/ExpenseListDisplay'
import { supabase } from '@/lib/supabaseClient';
import React, { useEffect, useState } from 'react'
import { Category, Expense } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect, type Option } from '@/components/custom/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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
      .order("id", { ascending: true });
    if (error) {
      console.error("Error fetching categories:", error);
    } else if (data) {
      setCategories(data as Category[]);
    }
  }

  const fetchExpenses = async () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const startDateISO = new Date(startDate.getTime() - 9 * 60 * 60 * 1000).toISOString();
    const endDateISO = new Date(endDate.getTime() - 9 * 60 * 60 * 1000).toISOString();

    let expenseIds: string[] = [];
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
      .select(`*, expense_categories ( category_id )`)
      .gte("date", startDateISO)
      .lte("date", endDateISO)
      .order("date", { ascending: true });

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

  const categoryOptions: Option[] = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className='text-3xl font-bold mb-8 text-center text-gray-800'>支出一覧</h1>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
        <Card>
          <CardHeader>
            <CardTitle>合計金額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-semibold text-primary'>{totalExpense.toLocaleString()} 円</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>フィルター</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='month-select' className='block text-sm font-medium text-gray-700 mb-1'>
                月の選択
              </Label>
              <Input
                id='month-select'
                type='month'
                value={selectedMonth}
                onChange={handleMonthChange}
                className='w-full'
              />
            </div>
            <div>
              <Label htmlFor='category-select' className='block text-sm font-medium text-gray-700 mb-1'>
                カテゴリー
              </Label>
              <MultiSelect
                id='category-select'
                options={categoryOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                placeholder='カテゴリー選択'
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
  )
}