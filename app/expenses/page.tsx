"use client";
import ExpenseListDisplay from '@/components/custom/ExpenseListDisplay'
import { supabase } from '@/lib/supabaseClient';
import React, { useEffect, useState } from 'react'
import { Expense } from '@/types';
import { init } from 'next/dist/compiled/webpack/webpack';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth]);

  const fetchExpenses = async () => {
    // selectedMonth から月初・月末を計算(GMT+9)
    const [year, month] = selectedMonth.split("-").map(Number);

    // 東京時間 (UTC+9) における月初と月末の計算
    const startDate = new Date(year, month - 1, 1, 0, 0, 0); // JSTの月初 00:00:00
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // JSTの月末 23:59:59.999

    // ISO形式にするためにUTCの時差（-9時間）を調整
    const startDateISO = new Date(startDate.getTime() - 9 * 60 * 60 * 1000).toISOString();
    const endDateISO = new Date(endDate.getTime() - 9 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("date", startDateISO)
      .lte("date", endDateISO)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching expenses:", error);
    } else if (data) {
      setExpenses(data);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };
  return (
    <div>
      <h1 className='text-2xl font-bold p-6'>支出一覧</h1>
      <div className='p-4'>
        <Label htmlFor='month-select' className='mr-2'>月の選択</Label>
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
