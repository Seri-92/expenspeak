export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  current_group_id: string | null;
  role: "user" | "admin";
  created_at?: string;
  updated_at?: string;
}
