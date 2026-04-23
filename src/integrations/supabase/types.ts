export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absence_settings: {
        Row: {
          bot_token: string | null
          created_at: string
          enabled: boolean
          id: string
          message_channel_id: string | null
          role_channel_id: string | null
          role_id: string | null
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          message_channel_id?: string | null
          role_channel_id?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          message_channel_id?: string | null
          role_channel_id?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      absences: {
        Row: {
          created_at: string
          discord_message_id: string | null
          discord_notified: boolean
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_message_id?: string | null
          discord_notified?: boolean
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_message_id?: string | null
          discord_notified?: boolean
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          user_id: string | null
          username: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
          username: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          discord_id: string | null
          id: string
          last_online: string | null
          password_hash: string
          role: string
          role_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          discord_id?: string | null
          id?: string
          last_online?: string | null
          password_hash: string
          role?: string
          role_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          discord_id?: string | null
          id?: string
          last_online?: string | null
          password_hash?: string
          role?: string
          role_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          age: number | null
          availability: string | null
          created_at: string
          discord_username: string | null
          experience: string | null
          id: string
          minecraft_username: string
          motivation: string | null
          position_id: string
          status: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          availability?: string | null
          created_at?: string
          discord_username?: string | null
          experience?: string | null
          id?: string
          minecraft_username: string
          motivation?: string | null
          position_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          availability?: string | null
          created_at?: string
          discord_username?: string | null
          experience?: string | null
          id?: string
          minecraft_username?: string
          motivation?: string | null
          position_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_channels: {
        Row: {
          channel_id: string | null
          created_at: string
          embed_color: string
          enabled: boolean
          id: string
          ping_roles: string[]
          position_id: string
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          embed_color?: string
          enabled?: boolean
          id?: string
          ping_roles?: string[]
          position_id: string
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          embed_color?: string
          enabled?: boolean
          id?: string
          ping_roles?: string[]
          position_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_channels_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_settings: {
        Row: {
          bot_token: string | null
          created_at: string
          guild_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      nav_items: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_visible: boolean
          link: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_visible?: boolean
          link?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_visible?: boolean
          link?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_open: boolean
          name: string
          questions: Json
          requirements: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_open?: boolean
          name: string
          questions?: Json
          requirements?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_open?: boolean
          name?: string
          questions?: Json
          requirements?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          color: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          permissions: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      task_settings: {
        Row: {
          bot_token: string | null
          channel_id: string | null
          created_at: string
          embed_color: string
          enabled: boolean
          id: string
          ping_role_id: string | null
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          channel_id?: string | null
          created_at?: string
          embed_color?: string
          enabled?: boolean
          id?: string
          ping_role_id?: string | null
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          channel_id?: string | null
          created_at?: string
          embed_color?: string
          enabled?: boolean
          id?: string
          ping_role_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_role_id: string | null
          assigned_user_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discord_message_id: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role_id?: string | null
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_message_id?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role_id?: string | null
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_message_id?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_role_id_fkey"
            columns: ["assigned_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_password: {
        Args: { _hash: string; _password: string }
        Returns: boolean
      }
      hash_password: { Args: { _password: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
