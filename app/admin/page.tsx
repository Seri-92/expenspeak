"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/components/custom/AppContext";
import { supabase } from "@/lib/supabaseClient";
import type { Group, UserProfile } from "@/types";

type AdminUser = Pick<UserProfile, "id" | "email" | "display_name" | "role">;
type AdminGroup = Pick<Group, "id" | "name" | "created_by">;

export default function Page() {
  const { isAuthenticated, loading, profile } = useAppContext();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedCategoryGroupId, setSelectedCategoryGroupId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"owner" | "member">("member");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = profile?.role === "admin";

  const loadAdminData = async () => {
    const [usersResult, groupsResult] = await Promise.all([
      supabase
        .from("users")
        .select("id, email, display_name, role")
        .order("email", { ascending: true }),
      supabase
        .from("groups")
        .select("id, name, created_by")
        .order("created_at", { ascending: false }),
    ]);

    if (usersResult.error || groupsResult.error) {
      setMessage("管理データの読み込みに失敗しました。");
      return;
    }

    const nextUsers = (usersResult.data ?? []) as AdminUser[];
    const nextGroups = (groupsResult.data ?? []) as AdminGroup[];

    setUsers(nextUsers);
    setGroups(nextGroups);
    setSelectedUserId((current) => current || nextUsers[0]?.id || "");
    setSelectedGroupId((current) => current || nextGroups[0]?.id || "");
    setSelectedCategoryGroupId((current) => current || nextGroups[0]?.id || "");
  };

  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      void loadAdminData();
    }
  }, [isAuthenticated, isAdmin, loading]);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const createGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = groupName.trim();
    if (!profile || !trimmedName) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: trimmedName,
        created_by: profile.id,
      })
      .select("id, name, created_by")
      .single();

    if (groupError || !group) {
      setMessage("グループ作成に失敗しました。");
      setIsSaving(false);
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: profile.id,
      role: "owner",
    });

    if (memberError) {
      setMessage("グループは作成されましたが、作成者の追加に失敗しました。");
      setIsSaving(false);
      return;
    }

    setGroupName("");
    setGroups((current) => [group as AdminGroup, ...current]);
    setSelectedGroupId(group.id);
    setSelectedCategoryGroupId(group.id);
    setMessage("グループを作成しました。");
    setIsSaving(false);
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedGroupId || !selectedUserId) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase.from("group_members").upsert(
      {
        group_id: selectedGroupId,
        user_id: selectedUserId,
        role: selectedRole,
      },
      { onConflict: "group_id,user_id" },
    );

    setIsSaving(false);

    if (error) {
      setMessage("メンバー追加に失敗しました。");
      return;
    }

    const user = userById.get(selectedUserId);
    setMessage(`${user?.email ?? "ユーザー"} をグループに追加しました。`);
  };

  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = categoryName.trim();
    if (!selectedCategoryGroupId || !trimmedName) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("categories")
      .insert({
        group_id: selectedCategoryGroupId,
        name: trimmedName,
      })
      .select("id, group_id, name")
      .single();

    setIsSaving(false);

    if (error) {
      setMessage("分類登録に失敗しました。");
      return;
    }

    setCategoryName("");
    setMessage("分類を登録しました。");
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="container mx-auto px-4 py-8">ログインしてください。</div>;
  }

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-8">管理者権限がありません。</div>;
  }

  return (
    <div className="container mx-auto grid gap-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">管理</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          グループ作成、ユーザーの所属グループ、分類を管理します。
        </p>
      </div>

      {message ? <p className="rounded border px-4 py-3 text-sm">{message}</p> : null}

      <section className="grid gap-4 rounded border p-4">
        <h2 className="text-lg font-medium">グループ作成</h2>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={createGroup}>
          <div className="grid gap-2">
            <Label htmlFor="group-name">グループ名</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSaving || !groupName.trim()}>
            グループを作成
          </Button>
        </form>
      </section>

      <section className="grid gap-4 rounded border p-4">
        <h2 className="text-lg font-medium">分類登録</h2>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={createCategory}>
          <div className="grid gap-2">
            <Label htmlFor="category-group">分類を登録するグループ</Label>
            <select
              id="category-group"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedCategoryGroupId}
              onChange={(event) => setSelectedCategoryGroupId(event.target.value)}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-name">分類名</Label>
            <Input
              id="category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSaving || !selectedCategoryGroupId || !categoryName.trim()}>
            分類を登録
          </Button>
        </form>
      </section>

      <section className="grid gap-4 rounded border p-4">
        <h2 className="text-lg font-medium">メンバー追加</h2>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto] md:items-end" onSubmit={addMember}>
          <div className="grid gap-2">
            <Label htmlFor="member-group">追加先グループ</Label>
            <select
              id="member-group"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-user">追加するユーザー</Label>
            <select
              id="member-user"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-role">ロール</Label>
            <select
              id="member-role"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as "owner" | "member")}
            >
              <option value="member">member</option>
              <option value="owner">owner</option>
            </select>
          </div>
          <Button type="submit" disabled={isSaving || !selectedGroupId || !selectedUserId}>
            追加
          </Button>
        </form>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-medium">グループ一覧</h2>
        <div className="overflow-x-auto rounded border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2 font-medium">名前</th>
                <th className="px-3 py-2 font-medium">作成者</th>
                <th className="px-3 py-2 font-medium">ID</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-t">
                  <td className="px-3 py-2">{group.name}</td>
                  <td className="px-3 py-2">{userById.get(group.created_by)?.email ?? group.created_by}</td>
                  <td className="px-3 py-2 font-mono text-xs">{group.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-medium">ユーザー一覧</h2>
        <div className="overflow-x-auto rounded border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2 font-medium">メール</th>
                <th className="px-3 py-2 font-medium">表示名</th>
                <th className="px-3 py-2 font-medium">role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2">{user.display_name ?? ""}</td>
                  <td className="px-3 py-2">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
