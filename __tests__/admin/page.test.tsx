import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Page from "@/app/admin/page";

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

function createSelectQuery(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(async () => ({ data, error: null })),
  };

  return query;
}

describe("Admin Page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextMock.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: {
        id: "admin-user",
        email: "admin@example.com",
        role: "admin",
      },
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return createSelectQuery([
          { id: "admin-user", email: "admin@example.com", display_name: "Admin", role: "admin" },
          { id: "member-user", email: "member@example.com", display_name: "Member", role: "user" },
        ]);
      }

      if (table === "groups") {
        return createSelectQuery([
          { id: "group-1", name: "共有グループ", created_by: "admin-user" },
        ]);
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  test("admin でないユーザーはアクセスできない", () => {
    useAppContextMock.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      profile: {
        id: "member-user",
        email: "member@example.com",
        role: "user",
      },
    });

    render(<Page />);

    expect(screen.getByText("管理者権限がありません。")).toBeTruthy();
  });

  test("admin はグループ作成、メンバー追加、分類登録のフォームを見られる", async () => {
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("管理")).toBeTruthy();
    });

    expect(screen.getByLabelText("グループ名")).toBeTruthy();
    expect(screen.getByRole("button", { name: "グループを作成" })).toBeTruthy();
    expect(screen.getByLabelText("追加先グループ")).toBeTruthy();
    expect(screen.getByLabelText("追加するユーザー")).toBeTruthy();
    expect(screen.getByLabelText("分類を登録するグループ")).toBeTruthy();
    expect(screen.getByLabelText("分類名")).toBeTruthy();
    expect(screen.getByRole("button", { name: "分類を登録" })).toBeTruthy();
    expect(screen.getAllByText("共有グループ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("member@example.com").length).toBeGreaterThan(0);
  });

  test("グループを作成できる", async () => {
    const groupInsertSelectSingleMock = vi.fn(async () => ({
      data: { id: "group-2", name: "新しい共有", created_by: "admin-user" },
      error: null,
    }));
    const groupInsertSelectMock = vi.fn(() => ({ single: groupInsertSelectSingleMock }));
    const groupInsertMock = vi.fn(() => ({ select: groupInsertSelectMock }));

    const memberInsertMock = vi.fn(async () => ({ error: null }));

    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return createSelectQuery([
          { id: "admin-user", email: "admin@example.com", display_name: "Admin", role: "admin" },
        ]);
      }

      if (table === "groups") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
          insert: groupInsertMock,
        };
      }

      if (table === "group_members") {
        return { insert: memberInsertMock };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    render(<Page />);

    fireEvent.change(await screen.findByLabelText("グループ名"), {
      target: { value: "新しい共有" },
    });
    fireEvent.click(screen.getByRole("button", { name: "グループを作成" }));

    await waitFor(() => {
      expect(groupInsertMock).toHaveBeenCalledWith({
        name: "新しい共有",
        created_by: "admin-user",
      });
    });
    expect(memberInsertMock).toHaveBeenCalledWith({
      group_id: "group-2",
      user_id: "admin-user",
      role: "owner",
    });
  });

  test("任意のユーザーをグループに追加できる", async () => {
    const memberUpsertMock = vi.fn(async () => ({ error: null }));

    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return createSelectQuery([
          { id: "admin-user", email: "admin@example.com", display_name: "Admin", role: "admin" },
          { id: "member-user", email: "member@example.com", display_name: "Member", role: "user" },
        ]);
      }

      if (table === "groups") {
        return createSelectQuery([
          { id: "group-1", name: "共有グループ", created_by: "admin-user" },
        ]);
      }

      if (table === "group_members") {
        return { upsert: memberUpsertMock };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    render(<Page />);

    fireEvent.change(await screen.findByLabelText("追加するユーザー"), {
      target: { value: "member-user" },
    });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(memberUpsertMock).toHaveBeenCalledWith(
        {
          group_id: "group-1",
          user_id: "member-user",
          role: "member",
        },
        { onConflict: "group_id,user_id" },
      );
    });
  });

  test("グループに分類を登録できる", async () => {
    const categoryInsertSelectSingleMock = vi.fn(async () => ({
      data: { id: 10, group_id: "group-1", name: "交通費" },
      error: null,
    }));
    const categoryInsertSelectMock = vi.fn(() => ({ single: categoryInsertSelectSingleMock }));
    const categoryInsertMock = vi.fn(() => ({ select: categoryInsertSelectMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return createSelectQuery([
          { id: "admin-user", email: "admin@example.com", display_name: "Admin", role: "admin" },
        ]);
      }

      if (table === "groups") {
        return createSelectQuery([
          { id: "group-1", name: "共有グループ", created_by: "admin-user" },
        ]);
      }

      if (table === "categories") {
        return { insert: categoryInsertMock };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    render(<Page />);

    fireEvent.change(await screen.findByLabelText("分類名"), {
      target: { value: "  交通費  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "分類を登録" }));

    await waitFor(() => {
      expect(categoryInsertMock).toHaveBeenCalledWith({
        group_id: "group-1",
        name: "交通費",
      });
    });
  });
});
