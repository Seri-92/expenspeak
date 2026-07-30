import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Page from "@/app/monthly-allocation/page";

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

function createIncomesQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(async () => ({
      data: [
        { recipient: "創平", amount: 300_000 },
        { recipient: "優希", amount: 220_000 },
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
    order: vi.fn(async () => ({
      data: [
        { amount: 100_000, category: { name: "食費" } },
        { amount: 30_000, category: { name: "デート" } },
      ],
      error: null,
    })),
  };

  return query;
}

describe("Monthly Allocation Page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextMock.mockReturnValue({
      groups: [{ id: "ssy-group", name: "SSY", role: "owner" }],
      loading: false,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "monthly_incomes") {
        return createIncomesQuery();
      }

      if (table === "expenses") {
        return createExpensesQuery();
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  test("デート支出を除外して二人の取り分を表示する", async () => {
    render(<Page />);

    expect(await screen.findByText("100,000 円")).toBeTruthy();
    expect(screen.getByText("各 210,000 円")).toBeTruthy();
    expect(screen.getByText(/\(520,000 円 − 100,000 円\) ÷ 2 = 各 210,000 円/)).toBeTruthy();
  });
});
