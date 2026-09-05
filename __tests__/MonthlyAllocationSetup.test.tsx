import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import MonthlyAllocationSetup from "@/components/custom/MonthlyAllocationSetup";

const { fromMock, insertMock } = vi.hoisted(() => ({ fromMock: vi.fn(), insertMock: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { from: fromMock } }));
const onConfigured = vi.fn();
const settings = { group_id: "ssy", food_category_id: 1, supplies_category_id: 2, work_category_id: 3 };
beforeEach(() => {
  vi.clearAllMocks();
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), insert: insertMock, single: vi.fn() };
  [query.select, query.eq, insertMock].forEach((mock) => mock.mockReturnValue(query));
  query.order.mockResolvedValue({ data: [{ id: 1, name: "食費" }, { id: 2, name: "日用品" }, { id: 3, name: "作業カフェ代" }], error: null });
  query.single.mockResolvedValue({ data: settings, error: null });
  fromMock.mockReturnValue(query);
});
afterEach(cleanup);

test("異なる名前で登録済みの分類をIDで対応付けて集計を開始できる", async () => {
  render(<MonthlyAllocationSetup groupId="ssy" onConfigured={onConfigured} />);
  const work = await screen.findByLabelText("外で仕事にかかるお金として集計する分類");
  fireEvent.change(work, { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "この3分類で集計を始める" }));
  await waitFor(() => expect(onConfigured).toHaveBeenCalledWith(settings));
  expect(insertMock).toHaveBeenCalledWith(settings);
});

test("同じ分類を二重に割り当てたり、未選択のまま開始したりできない", async () => {
  render(<MonthlyAllocationSetup groupId="ssy" onConfigured={onConfigured} />);
  const work = await screen.findByLabelText("外で仕事にかかるお金として集計する分類");
  fireEvent.click(screen.getByRole("button", { name: "この3分類で集計を始める" }));
  expect(await screen.findByText("3項目それぞれに、異なる分類を選択してください。")).toBeTruthy();
  fireEvent.change(work, { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "この3分類で集計を始める" }));
  expect(insertMock).not.toHaveBeenCalled();
});
