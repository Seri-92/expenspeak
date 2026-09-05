import { beforeEach, expect, test, vi } from "vitest";
import { loadMonthlyAllocation } from "@/lib/monthlyAllocationData";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { from: fromMock } }));
const settings = { group_id: "ssy", food_category_id: 1, supplies_category_id: 2, work_category_id: 3, created_at: "" };
let queries: Record<string, ReturnType<typeof query>>;
function query() {
  const q = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lt: vi.fn(), in: vi.fn(), order: vi.fn(), range: vi.fn(), then: vi.fn() };
  [q.select, q.eq, q.gte, q.lt, q.in, q.order].forEach((mock) => mock.mockReturnValue(q));
  q.then.mockImplementation((resolve) => resolve({ data: [], error: null }));
  q.range.mockResolvedValue({ data: [], error: null });
  return q;
}
beforeEach(() => {
  queries = { monthly_incomes: query(), monthly_fixed_costs: query(), expenses: query() };
  fromMock.mockImplementation((table: string) => queries[table]);
});

test("当月の収入と前月の固定費を取得し、支出は日本時間の前月だけに絞る", async () => {
  await loadMonthlyAllocation(settings, "2026-08");
  expect(queries.monthly_incomes.eq).toHaveBeenCalledWith("target_month", "2026-08-01");
  expect(queries.monthly_fixed_costs.eq).toHaveBeenCalledWith("target_month", "2026-07-01");
  expect(queries.expenses.eq).toHaveBeenCalledWith("group_id", "ssy");
  expect(queries.expenses.gte).toHaveBeenCalledWith("date", "2026-06-30T15:00:00.000Z");
  expect(queries.expenses.lt).toHaveBeenCalledWith("date", "2026-07-31T15:00:00.000Z");
  expect(queries.expenses.in).toHaveBeenCalledWith("category_id", [1, 2, 3]);
});

test("取得上限を超える支出も最後のページまで集計に含める", async () => {
  const rows = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), category_id: 1, amount: 100 }));
  queries.expenses.range.mockResolvedValueOnce({ data: rows, error: null }).mockResolvedValueOnce({ data: [{ id: "last", category_id: 2, amount: 50 }], error: null });
  const result = await loadMonthlyAllocation(settings, "2026-08");
  expect(result.expenses).toHaveLength(1001);
  expect(queries.expenses.range).toHaveBeenLastCalledWith(1000, 1999);
});

test("途中の支出取得が失敗したら部分的な合計を返さない", async () => {
  queries.expenses.range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, () => ({ amount: 1 })), error: null })
    .mockResolvedValueOnce({ data: null, error: new Error("offline") });
  await expect(loadMonthlyAllocation(settings, "2026-08")).rejects.toThrow("offline");
});
