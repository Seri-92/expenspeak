export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  current_group_id: string | null;
  created_at?: string;
  updated_at?: string;
}
