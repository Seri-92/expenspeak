"use client";
import ExpenseListDisplay from '@/components/custom/ExpenseListDisplay'
import { supabase } from '@/lib/supabaseClient';
import React, { useEffect, useState } from 'react'

export default function page() {
  const [expenses, setExpenses] = useState([]);

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
      <h1 className='p-6'>支出一覧</h1>
      <ExpenseListDisplay expenses={expenses} />
    </div>
  )
}
