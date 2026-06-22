import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ExpenseList from "@/app/ExpenseList";

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
    order: vi.fn(async () => ({
      data: [],
      error: null,
    })),
  };

  return query;
}

describe("ExpenseList", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextMock.mockReturnValue({
      currentGroup: { id: "group-1", name: "個人グループ", role: "owner" },
      loading: false,
      session: { user: { id: "user-1" } },
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

  test("音声入力未対応ブラウザではメッセージを表示する", async () => {
    render(<ExpenseList />);

    const voiceButton = await screen.findByRole("button", { name: "音声入力" });
    fireEvent.click(voiceButton);

    await waitFor(() => {
      expect(screen.getByText("このブラウザでは音声入力に対応していません。")).toBeTruthy();
    });
  });

  test("日付入力は狭い画面でも親要素からはみ出さない幅指定を持つ", async () => {
    render(<ExpenseList />);

    const dateInput = await screen.findByPlaceholderText("日付");
    const classNames = dateInput.className.split(/\s+/);

    expect(classNames).toContain("w-full");
    expect(classNames).toContain("min-w-0");
    expect(classNames).toContain("max-w-full");
  });
});
