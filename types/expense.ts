export interface Expense {
  id: string;
  group_id: string;
  category_id: number;
  created_by: string;
  amount: number;
  description: string;
  date: string;
  created_at?: string;
  updated_at?: string;
  category?: {
    id: number;
    name: string;
  } | null;
}
