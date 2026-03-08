export interface Group {
  id: string;
  name: string;
  created_by: string;
  personal_owner_user_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at?: string;
  group?: Group;
}
