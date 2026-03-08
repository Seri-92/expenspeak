import ProtectedRoute from "@/components/custom/ProtectedRoute";
import ExpenseList from "@/app/ExpenseList";

export default function Home() {
  return (
    <ProtectedRoute>
      <ExpenseList />
    </ProtectedRoute>
  );
}
