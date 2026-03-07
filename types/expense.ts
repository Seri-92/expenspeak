export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface ExpenseCategory {
  expense_id: string;
  category_id: number;
}
