export interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
}

export interface ExpenseCategory {
  expense_id: number;
  category_id: number;
}