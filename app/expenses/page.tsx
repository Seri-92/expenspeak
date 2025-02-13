"use client";
import ExpenseListDisplay from '@/components/custom/ExpenseListDisplay'
import { supabase } from '@/lib/supabaseClient';
import React, { useEffect, useState } from 'react'
import { Expense } from '@/types';
import { init } from 'next/dist/compiled/webpack/webpack';
import { Input } from '@/components/ui/input';

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

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
      setExpenses(data);
    }
  };
  return (
    <div>
      <h1 className='text-2xl font-bold p-6'>支出一覧</h1>
      <div className='p-4'>
        <label htmlFor='month-select' className='mr-2'>月の選択</label>
        <Input
          id='month-select'
          type='month'
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className='w-40'
        />
      </div>
      <ExpenseListDisplay expenses={expenses} />
    </div>
  )
}
