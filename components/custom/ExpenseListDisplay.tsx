import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from "@/types";

interface ExpenseListDisplayProps {
  expenses: Expense[];
  limit?: number; // 表示アイテム数の制限
}

export default function ExpenseListDisplay({ expenses, limit }: ExpenseListDisplayProps) {
  const displayedExpenses = limit ? expenses.slice(0, limit) : expenses;

  return (
    <div className="grid gap-4">
      {displayedExpenses.map((expense) => (
        <Card key={expense.id}>
          <CardHeader>
            <CardTitle>
              {new Date(expense.date).toLocaleDateString()}: ¥{expense.amount}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>{expense.description}</p>
            {expense.category ? (
              <p className="text-sm text-muted-foreground">{expense.category.name}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
