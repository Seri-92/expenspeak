export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          group_id: string;
          id: number;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: number;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: number;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category_id: number;
          created_at: string;
          created_by: string;
          date: string;
          description: string;
          group_id: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          category_id: number;
          created_at?: string;
          created_by: string;
          date: string;
          description?: string;
          group_id: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category_id?: number;
          created_at?: string;
          created_by?: string;
          date?: string;
          description?: string;
          group_id?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_group_fkey";
            columns: ["category_id", "group_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "group_id"];
          },
        ];
      };
      group_members: {
        Row: {
          created_at: string;
          group_id: string;
          role: "owner" | "member";
          user_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          role: "owner" | "member";
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          role?: "owner" | "member";
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          personal_owner_user_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          personal_owner_user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          personal_owner_user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_personal_owner_user_id_fkey";
            columns: ["personal_owner_user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_group_id: string | null;
          display_name: string | null;
          email: string;
          id: string;
          role: "user" | "admin";
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_group_id?: string | null;
          display_name?: string | null;
          email: string;
          id: string;
          role?: "user" | "admin";
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_group_id?: string | null;
          display_name?: string | null;
          email?: string;
          id?: string;
          role?: "user" | "admin";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_current_group_id_fkey";
            columns: ["current_group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_group_member: {
        Args: {
          target_group_id: string;
        };
        Returns: boolean;
      };
      is_group_owner: {
        Args: {
          target_group_id: string;
        };
        Returns: boolean;
      };
      provision_current_user: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      set_current_group: {
        Args: {
          target_group_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type PublicSchema = DatabaseWithoutInternals["public"];

export type Tables<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName]["Row"];

export type TablesInsert<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName]["Insert"];

export type TablesUpdate<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName]["Update"];
