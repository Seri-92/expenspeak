"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Group, GroupMember, UserProfile } from "@/types";

type GroupOption = Pick<Group, "id" | "name"> & {
  role: GroupMember["role"];
};

interface AppContextValue {
  groups: GroupOption[];
  currentGroup: GroupOption | null;
  isAuthenticated: boolean;
  loading: boolean;
  profile: UserProfile | null;
  session: Session | null;
  switchGroup: (groupId: string) => Promise<void>;
  refreshAppState: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name, avatar_url, current_group_id, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data as UserProfile;
}

async function fetchGroups(userId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("role, group:groups!group_members_group_id_fkey(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .map((member) => {
      const group = Array.isArray(member.group) ? member.group[0] : member.group;
      if (!group) {
        return null;
      }

      return {
        id: group.id,
        name: group.name,
        role: member.role,
      } satisfies GroupOption;
    })
    .filter((group): group is GroupOption => group !== null);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAppState = useCallback(async (nextSession?: Session | null) => {
    setLoading(true);

    const resolvedSession =
      nextSession ??
      (await supabase.auth.getSession()).data.session ??
      null;

    setSession(resolvedSession);

    if (!resolvedSession) {
      setProfile(null);
      setGroups([]);
      setLoading(false);
      return;
    }

    let nextProfile = await fetchProfile(resolvedSession.user.id);

    if (!nextProfile) {
      const { error } = await supabase.rpc("provision_current_user");
      if (error) {
        console.error("Failed to provision current user:", error);
      } else {
        nextProfile = await fetchProfile(resolvedSession.user.id);
      }
    }

    if (!nextProfile) {
      setProfile(null);
      setGroups([]);
      setLoading(false);
      return;
    }

    const nextGroups = await fetchGroups(resolvedSession.user.id);

    setProfile(nextProfile);
    setGroups(nextGroups);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAppState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadAppState(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAppState]);

  const switchGroup = async (groupId: string) => {
    const { error } = await supabase.rpc("set_current_group", {
      target_group_id: groupId,
    });

    if (error) {
      console.error("Failed to switch group:", error);
      return;
    }

    await loadAppState(session);
  };

  const currentGroup =
    groups.find((group) => group.id === profile?.current_group_id) ?? null;

  return (
    <AppContext.Provider
      value={{
        groups,
        currentGroup,
        isAuthenticated: Boolean(session),
        loading,
        profile,
        session,
        switchGroup,
        refreshAppState: () => loadAppState(session),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
