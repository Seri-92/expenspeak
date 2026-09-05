import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import MonthlyAmountEditor from "@/components/custom/MonthlyAmountEditor";

const { fromMock, insertMock, updateMock, eqMock, singleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(), insertMock: vi.fn(), updateMock: vi.fn(), eqMock: vi.fn(), singleMock: vi.fn(),
}));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { from: fromMock } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  const query = { insert: insertMock, update: updateMock, eq: eqMock, select: vi.fn(), single: singleMock };
  [insertMock, updateMock, eqMock, query.select].forEach((mock) => mock.mockReturnValue(query));
  fromMock.mockReturnValue(query);
  singleMock.mockResolvedValue({ data: { id: "saved-id", amount: 300000 }, error: null });
});

const props = { groupId: "ssy", month: "2026-08", userId: "user-1", kind: "income" as const, item: "創平" as const, record: null, onSaved: vi.fn() };

test("相手が未入力でも一人分だけ保存し、ボタンに対象年月を表示する", async () => {
  render(<MonthlyAmountEditor {...props} />);
  fireEvent.change(screen.getByLabelText("2026年8月の創平の手取り"), { target: { value: "300000" } });
  fireEvent.click(screen.getByRole("button", { name: "創平の2026年8月の手取りを保存" }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith({ id: "saved-id", amount: 300000 }));
  expect(insertMock).toHaveBeenCalledWith({ group_id: "ssy", target_month: "2026-08-01", recipient: "創平", amount: 300000, created_by: "user-1" });
});

test("未入力を0円として保存しない", async () => {
  render(<MonthlyAmountEditor {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /を保存$/ }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "金額を入力してください。請求がない場合は0円を入力してください。");
  expect(insertMock).not.toHaveBeenCalled();
});

test("固定費は指定された生活費の月に0円でも保存できる", async () => {
  render(<MonthlyAmountEditor {...props} kind="fixed" item="水道代" month="2026-07" />);
  fireEvent.change(screen.getByLabelText("2026年7月分の水道代"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "2026年7月分の水道代を保存" }));
  await waitFor(() => expect(insertMock).toHaveBeenCalled());
  expect(fromMock).toHaveBeenCalledWith("monthly_fixed_costs");
  expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ target_month: "2026-07-01", item: "水道代", amount: 0 }));
});

test("保存済みの収入はそのレコードの金額だけ更新する", async () => {
  render(<MonthlyAmountEditor {...props} record={{ id: "sohei-id", amount: 200000 }} />);
  fireEvent.change(screen.getByLabelText("2026年8月の創平の手取り"), { target: { value: "300000" } });
  fireEvent.click(screen.getByRole("button", { name: /を保存$/ }));
  await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ amount: 300000 }));
  expect(eqMock).toHaveBeenCalledWith("id", "sohei-id");
  expect(eqMock).toHaveBeenCalledWith("group_id", "ssy");
  expect(insertMock).not.toHaveBeenCalled();
});

test("保存に失敗しても入力を保持して再試行できる", async () => {
  singleMock.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
  render(<MonthlyAmountEditor {...props} />);
  const input = screen.getByLabelText("2026年8月の創平の手取り") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "300000" } });
  fireEvent.click(screen.getByRole("button", { name: /を保存$/ }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "保存に失敗しました。入力内容を確認して再度保存してください。");
  expect(input.value).toBe("300000");
  expect(props.onSaved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /を保存$/ }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalled());
});
