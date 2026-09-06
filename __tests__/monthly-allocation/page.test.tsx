import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Page from "@/app/monthly-allocation/page";
import { fixedCostItems } from "@/lib/monthlyAllocation";

const { contextMock, fromMock, loadMock, insertMock } = vi.hoisted(() => ({
  contextMock: vi.fn(), fromMock: vi.fn(), loadMock: vi.fn(), insertMock: vi.fn(),
}));
vi.mock("@/components/custom/AppContext", () => ({ useAppContext: contextMock }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { from: fromMock } }));
vi.mock("@/lib/monthlyAllocationData", () => ({ loadMonthlyAllocation: loadMock }));

const settings = { group_id: "ssy", food_category_id: 1, supplies_category_id: 2, work_category_id: 3 };
function data() {
  return {
    incomes: [{ id: "s", recipient: "創平", amount: 300000 }, { id: "y", recipient: "優希", amount: 220000 }],
    fixedCosts: fixedCostItems.map((item, index) => ({ id: String(index), item, amount: [100000, 10000, 10000, 0, 20000][index] })),
    expenses: [{ id: "expense", category_id: 1, amount: 80000, date: "2026-07-10T00:00:00Z", description: "スーパー" }],
  };
}
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  contextMock.mockReturnValue({
    groups: [{ id: "ssy", name: "SSY", role: "owner" }],
    currentGroup: { id: "personal", name: "個人" },
    loading: false, session: { user: { id: "user-1" } },
  });
  const q = { select: vi.fn(), order: vi.fn(), insert: insertMock, single: vi.fn() };
  q.select.mockReturnValue(q);
  q.order.mockResolvedValue({ data: [settings], error: null });
  insertMock.mockReturnValue(q);
  q.single.mockResolvedValue({ data: { id: "saved-y", amount: 220000 }, error: null });
  fromMock.mockReturnValue(q);
  loadMock.mockResolvedValue(data());
});

async function august() {
  render(<Page />);
  await screen.findByRole("heading", { name: /に受け取った手取り$/ });
  fireEvent.change(screen.getByLabelText("手取りを受け取った月（集計月）"), { target: { value: "2026-08" } });
  await screen.findByRole("heading", { name: "2026年8月に受け取った手取り" });
}

test("当月の手取りと前月の生活費を年月付きで区別して表示する", async () => {
  await august();
  expect(screen.getByRole("heading", { name: "2026年7月の変動費" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "2026年7月分の固定費" })).toBeTruthy();
  expect(screen.getAllByText("150,000 円")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "取り分" })).toBeTruthy();
  expect(screen.queryByText("創平の取り分")).toBeNull();
  expect(screen.queryByText("優希の取り分")).toBeNull();
  expect(screen.getByRole("heading", { name: "送る金額" })).toBeTruthy();
  expect(screen.getByText("優希 → 創平")).toBeTruthy();
  expect(screen.getByText("70,000 円")).toBeTruthy();
  expect(screen.getByText("集計対象: SSY")).toBeTruthy();
  expect(loadMock).toHaveBeenLastCalledWith(settings, "2026-08");
  fireEvent.click(screen.getByText(/食費の明細/));
  expect(screen.getByText("スーパー")).toBeTruthy();
});

test("入力不足は0円で計算せず、年月付きの不足項目を示す", async () => {
  const incomplete = data();
  incomplete.incomes = incomplete.incomes.slice(0, 1);
  incomplete.fixedCosts = incomplete.fixedCosts.filter((row) => row.item !== "水道代");
  loadMock.mockResolvedValue(incomplete);
  await august();
  expect(screen.getByText("取り分は入力待ちです")).toBeTruthy();
  expect(screen.getByText("2026年8月の優希の手取り", { selector: "li" })).toBeTruthy();
  expect(screen.getByText("2026年7月分の水道代", { selector: "li" })).toBeTruthy();
  expect(screen.queryByText("150,000 円")).toBeNull();
  expect(screen.queryByRole("heading", { name: "送る金額" })).toBeNull();
});

test("保存後に取り分を更新し、他の項目の入力途中の値を保持する", async () => {
  const incomplete = data();
  incomplete.incomes = incomplete.incomes.slice(0, 1);
  loadMock.mockResolvedValue(incomplete);
  await august();
  const rent = screen.getByLabelText("2026年7月分の家賃") as HTMLInputElement;
  fireEvent.change(rent, { target: { value: "105000" } });
  fireEvent.change(screen.getByLabelText("2026年8月の優希の手取り"), { target: { value: "220000" } });
  fireEvent.click(screen.getByRole("button", { name: "優希の2026年8月の手取りを保存" }));
  await waitFor(() => expect(screen.getAllByText("150,000 円")).toHaveLength(1));
  expect(screen.getByText("優希 → 創平")).toBeTruthy();
  expect(screen.getByText("70,000 円")).toBeTruthy();
  expect(rent.value).toBe("105000");
});

test("1月に切り替えると前年12月の固定費になり、前の月の入力は残らない", async () => {
  await august();
  fireEvent.change(screen.getByLabelText("2026年8月の創平の手取り"), { target: { value: "999999" } });
  fireEvent.change(screen.getByLabelText("手取りを受け取った月（集計月）"), { target: { value: "2027-01" } });
  await screen.findByLabelText("2026年12月分の家賃");
  expect((screen.getByLabelText("2027年1月の創平の手取り") as HTMLInputElement).value).toBe("300000");
  expect(screen.queryByLabelText("2026年7月分の家賃")).toBeNull();
});

test("月切り替え前の遅い応答で新しい月を上書きしない", async () => {
  await august();
  let finishOld!: (value: ReturnType<typeof data>) => void;
  loadMock.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
  fireEvent.change(screen.getByLabelText("手取りを受け取った月（集計月）"), { target: { value: "2026-09" } });
  await waitFor(() => expect(loadMock).toHaveBeenLastCalledWith(settings, "2026-09"));
  fireEvent.change(screen.getByLabelText("手取りを受け取った月（集計月）"), { target: { value: "2026-10" } });
  await screen.findByLabelText("2026年10月の創平の手取り");
  const old = data();
  old.incomes[0].amount = 999999;
  finishOld(old);
  await waitFor(() => expect((screen.getByLabelText("2026年10月の創平の手取り") as HTMLInputElement).value).toBe("300000"));
});

test("読み込み失敗を0円として表示せず再試行できる", async () => {
  loadMock.mockRejectedValueOnce(new Error("offline"));
  render(<Page />);
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("集計の読み込みに失敗しました"));
  expect(screen.queryByText("0 円")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));
  expect(await screen.findAllByText("150,000 円")).toHaveLength(1);
});

test("グループが改名されても設定済みのIDで集計する", async () => {
  contextMock.mockReturnValue({
    groups: [{ id: "ssy", name: "新しい名前", role: "owner" }],
    loading: false, session: { user: { id: "user-1" } },
  });
  await august();
  expect(screen.getByText("集計対象: 新しい名前")).toBeTruthy();
  expect(loadMock).toHaveBeenLastCalledWith(settings, "2026-08");
});

test.each([
  [480000, "創平 → 優希", "20,000 円"],
  [440000, "送金不要", "0 円"],
])("差額に応じて送金方向を表示する（創平の手取り %s 円）", async (income, direction, result) => {
  const monthly = data();
  monthly.incomes[0].amount = income;
  loadMock.mockResolvedValue(monthly);
  await august();
  expect(screen.getByRole("heading", { name: "送る金額" })).toBeTruthy();
  expect(screen.getByText(direction)).toBeTruthy();
  expect(screen.getByText(result, { selector: "p" })).toBeTruthy();
});
