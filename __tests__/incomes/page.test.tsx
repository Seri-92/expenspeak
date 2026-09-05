import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Page from "@/app/incomes/page";

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

function createMonthlyIncomesQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(async () => ({
      data: [
        { id: "sohei", recipient: "創平", amount: 300_000 },
        { id: "yuki", recipient: "優希", amount: 220_000 },
      ],
      error: null,
    })),
    upsert: vi.fn(async () => ({ error: null })),
  };

  return query;
}

describe("Income Page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextMock.mockReturnValue({
      currentGroup: { id: "group-1", name: "SSY", role: "owner" },
      loading: false,
      session: { user: { id: "user-1" } },
    });
    fromMock.mockReturnValue(createMonthlyIncomesQuery());
  });

  test("選択中グループの創平と優希の月次手取りを表示する", async () => {
    render(<Page />);

    expect(await screen.findByText("現在のグループ: SSY")).toBeTruthy();
    expect((await screen.findByLabelText(/の創平の手取り$/) as HTMLInputElement).value).toBe("300000");
    expect((screen.getByLabelText(/の優希の手取り$/) as HTMLInputElement).value).toBe("220000");

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith("monthly_incomes");
    });
  });

  test("受け取った月を変更すると、その月だけを読み込む", async () => {
    const query = createMonthlyIncomesQuery();
    fromMock.mockReturnValue(query);
    render(<Page />);
    await screen.findByLabelText(/の創平の手取り$/);
    fireEvent.change(screen.getByLabelText("手取りを受け取った月"), { target: { value: "2026-08" } });
    await screen.findByLabelText("2026年8月の創平の手取り");
    expect(query.eq).toHaveBeenCalledWith("target_month", "2026-08-01");
  });
});
