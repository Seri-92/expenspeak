import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Page from "@/app/expenses/page";

const useAppContextMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/components/custom/AppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

function createCategoriesQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(async () => ({
      data: [
        { id: 1, group_id: "group-1", name: "食費" },
        { id: 2, group_id: "group-1", name: "交通費" },
      ],
      error: null,
    })),
  };

  return query;
}

function createExpensesQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(async () => ({
      data: [
        {
          id: "expense-1",
          group_id: "group-1",
          category_id: 1,
          created_by: "user-1",
          amount: 1200,
          description: "ランチ",
          date: "2026-03-01T00:00:00.000Z",
          category: { id: 1, name: "食費" },
        },
      ],
      error: null,
    })),
  };

  return query;
}

describe("Expense Page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextMock.mockReturnValue({
      currentGroup: { id: "group-1", name: "個人グループ", role: "owner" },
      loading: false,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "categories") {
        return createCategoriesQuery();
      }

      if (table === "expenses") {
        return createExpensesQuery();
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  test("初期表示で現在の月がセットされている", async () => {
    render(<Page />);

    const monthInput = (await screen.findByLabelText(/月の選択/i)) as HTMLInputElement;
    const expectedMonth = new Date().toISOString().slice(0, 7);

    expect(monthInput.value).toBe(expectedMonth);
    await waitFor(() => {
      expect(screen.getByText("1,200 円")).toBeTruthy();
    });
  });

  test("選択中グループの支出合計を表示する", async () => {
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("現在のグループ: 個人グループ")).toBeTruthy();
    });

    expect(screen.getAllByText("ランチ")).toHaveLength(1);
    expect(screen.getByText("1,200 円")).toBeTruthy();
  });

  test("グループ未選択時は案内を表示する", () => {
    useAppContextMock.mockReturnValue({
      currentGroup: null,
      loading: false,
    });

    render(<Page />);

    expect(screen.getByText("利用可能なグループがありません。")).toBeTruthy();
  });
});
