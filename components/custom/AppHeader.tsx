"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useAppContext } from "@/components/custom/AppContext";

export default function AppHeader() {
  const { currentGroup, groups, isAuthenticated, loading, profile, switchGroup } =
    useAppContext();

  return (
    <header className="flex min-h-16 flex-wrap items-center gap-3 border-b px-6 py-3">
      <Button asChild variant="ghost" className="px-0 text-xl font-bold">
        <Link href="/">Expenspeak</Link>
      </Button>
      <Button asChild variant="ghost" className="text-base font-medium">
        <Link href="/expenses">支出一覧</Link>
      </Button>
      {profile?.role === "admin" ? (
        <Button asChild variant="ghost" className="text-base font-medium">
          <Link href="/admin">管理</Link>
        </Button>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {isAuthenticated && !loading ? (
          <>
            <Select
              value={currentGroup?.id}
              onValueChange={(value) => {
                void switchGroup(value);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="グループを選択" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {profile?.display_name ?? profile?.email}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                void supabase.auth.signOut();
              }}
            >
              ログアウト
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
