// app/page.tsx
import ProtectedRoute from '@/components/custom/ProtectedRoute';
import { supabase } from '../lib/supabaseClient';
import ExpenseList from './ExpenseList';

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
}

export default async function Home() {
  // サーバーサイドで Supabase から支出データをフェッチ
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return <div>Error fetching expenses</div>;
  }

  // フェッチしたデータをクライアントコンポーネントに渡す
  return (
    <ProtectedRoute>
      <ExpenseList initialExpenses={expenses as Expense[]} />
    </ProtectedRoute>
  );
}