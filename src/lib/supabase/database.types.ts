
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "contact_messages": {
                  Row: {
                    "anonymous": boolean,"created_at": string,"email": string | null,"id": string,"message": string,"name": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymous"?: boolean,"created_at"?: string,"email"?: string | null,"id"?: string,"message": string,"name"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "anonymous"?: boolean,"created_at"?: string,"email"?: string | null,"id"?: string,"message"?: string,"name"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"custom_sounds": {
                  Row: {
                    "created_at": string,"duration_ms": number,"id": string,"name": string,"path": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_ms": number,"id"?: string,"name": string,"path": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"duration_ms"?: number,"id"?: string,"name"?: string,"path"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"focus_sessions": {
                  Row: {
                    "ended_at": string | null,"focus_seconds": number | null,"habit_id": string,"id": string,"mode": string,"paused_at": string | null,"paused_seconds": number,"plan": Json | null,"skipped_seconds": number,"sound_id": string | null,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_at"?: string | null,"focus_seconds"?: number | null,"habit_id": string,"id"?: string,"mode": string,"paused_at"?: string | null,"paused_seconds"?: number,"plan"?: Json | null,"skipped_seconds"?: number,"sound_id"?: string | null,"started_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "ended_at"?: string | null,"focus_seconds"?: number | null,"habit_id"?: string,"id"?: string,"mode"?: string,"paused_at"?: string | null,"paused_seconds"?: number,"plan"?: Json | null,"skipped_seconds"?: number,"sound_id"?: string | null,"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "focus_sessions_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_archive_periods": {
                  Row: {
                    "archived_on": string,"habit_id": string,"id": string,"restored_on": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_on": string,"habit_id": string,"id"?: string,"restored_on"?: string | null
                  }
                  Update: {
                    "archived_on"?: string,"habit_id"?: string,"id"?: string,"restored_on"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_archive_periods_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_completions": {
                  Row: {
                    "completion_date": string,"created_at": string,"habit_id": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completion_date": string,"created_at"?: string,"habit_id": string,"id"?: string
                  }
                  Update: {
                    "completion_date"?: string,"created_at"?: string,"habit_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_completions_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_schedules": {
                  Row: {
                    "effective_from": string,"habit_id": string,"id": string,"kind": string,"times_per_week": number | null,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "effective_from": string,"habit_id": string,"id"?: string,"kind": string,"times_per_week"?: number | null,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "effective_from"?: string,"habit_id"?: string,"id"?: string,"kind"?: string,"times_per_week"?: number | null,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_schedules_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    }
                  ]
                },"habits": {
                  Row: {
                    "archived_at": string | null,"color": string,"created_at": string,"description": string | null,"icon": string,"id": string,"links": (string)[],"name": string,"start_date": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"color": string,"created_at"?: string,"description"?: string | null,"icon": string,"id"?: string,"links"?: (string)[],"name": string,"start_date": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"color"?: string,"created_at"?: string,"description"?: string | null,"icon"?: string,"id"?: string,"links"?: (string)[],"name"?: string,"start_date"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "accent": string | null,"accent_custom": string | null,"avatar_color": string | null,"avatar_kind": string,"avatar_url": string | null,"avatar_value": string | null,"created_at": string,"display_name": string | null,"sound_id": string,"sound_volume": number,"tag": string,"timezone": string,"user_id": string,"week_starts_on": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"accent_custom"?: string | null,"avatar_color"?: string | null,"avatar_kind"?: string,"avatar_url"?: string | null,"avatar_value"?: string | null,"created_at"?: string,"display_name"?: string | null,"sound_id"?: string,"sound_volume"?: number,"tag": string,"timezone"?: string,"user_id": string,"week_starts_on"?: number
                  }
                  Update: {
                    "accent"?: string | null,"accent_custom"?: string | null,"avatar_color"?: string | null,"avatar_kind"?: string,"avatar_url"?: string | null,"avatar_value"?: string | null,"created_at"?: string,"display_name"?: string | null,"sound_id"?: string,"sound_volume"?: number,"tag"?: string,"timezone"?: string,"user_id"?: string,"week_starts_on"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "all_different":
{ Args: { "p_values": (number)[] }; Returns: boolean
                           },
"all_web_links":
{ Args: { "p_links": (string)[] }; Returns: boolean
                           },
"apply_schedule_change":
{ Args: { "p_action": string,"p_effective_from": string,"p_habit_id": string,"p_kind": string,"p_times_per_week": number,"p_today": string }; Returns: undefined
                           } |
{ Args: { "p_action": string,"p_effective_from": string,"p_habit_id": string,"p_kind": string,"p_times_per_week": number,"p_today": string,"p_weekdays": (number)[] }; Returns: undefined
                           },
"archive_habit":
{ Args: { "p_habit_id": string,"p_on": string }; Returns: undefined
                           },
"create_habit":
{ Args: { "p_color": string,"p_description": string,"p_icon": string,"p_kind": string,"p_name": string,"p_start_date": string,"p_times_per_week": number }; Returns: string
                           } |
{ Args: { "p_color": string,"p_description": string,"p_icon": string,"p_kind": string,"p_name": string,"p_start_date": string,"p_times_per_week": number,"p_weekdays": (number)[] }; Returns: string
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"replace_my_data":
{ Args: { "p_backup": Json }; Returns: Json
                           },
"restore_habit":
{ Args: { "p_habit_id": string,"p_on": string }; Returns: undefined
                           },
"server_now":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_completion":
{ Args: { "p_date": string,"p_done": boolean,"p_habit_id": string,"p_today": string }; Returns: undefined
                           },
"valid_focus_plan":
{ Args: { "p_plan": Json }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
