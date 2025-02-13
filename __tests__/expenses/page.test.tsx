import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "@/app/expenses/page";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { a } from "vitest/dist/chunks/suite.BJU7kdY9.js";

// Supabase のチェーン用のモックを作成

vi.mock("@/lib/supabaseClient", () => {
  const gteMock = vi.fn().mockReturnThis();
  const lteMock = vi.fn().mockReturnThis();
  const orderMock = vi.fn().mockReturnThis();
  const selectMock = vi.fn().mockReturnThis();
  const fromMock = vi.fn(() => ({
    select: selectMock,
    gte: gteMock,
    lte: lteMock,
    order: orderMock,
  }));

  return {
    supabase: {
      from: fromMock,
    },
  };
});


describe("Expense Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<Page />);
  });

  test("初期表示で現在の月がセットされている", () => {
    const monthInput = screen.getByLabelText(/月の選択/i) as HTMLInputElement;
    const expectedMonth = new Date().toISOString().slice(0, 7);
    expect(monthInput.value).toBe(expectedMonth);
  });

  test("月選択を変更すると state が更新される", () => {
    const monthInput = screen.getByLabelText(/月の選択/i) as HTMLInputElement;
    fireEvent.change(monthInput, { target: { value: "2025-03" } });

    expect(monthInput.value).toBe("2025-03");
  });
});
