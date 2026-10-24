
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
            "circle_invites": {
                  Row: {
                    "circle_id": string,"created_at": string,"expires_at": string,"id": string,"revoked": boolean,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "circle_id": string,"created_at"?: string,"expires_at": string,"id"?: string,"revoked"?: boolean,"token_hash": string
                  }
                  Update: {
                    "circle_id"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"revoked"?: boolean,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "circle_invites_circle_id_fkey"
      columns: ["circle_id"]
isOneToOne: false
      referencedRelation: "circles"
      referencedColumns: ["id"]
    }
                  ]
                },"circle_members": {
                  Row: {
                    "allow_cheers": boolean,"circle_id": string,"closer": boolean,"color": string,"in_week": boolean,"joined_at": string,"pinned": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_cheers"?: boolean,"circle_id": string,"closer"?: boolean,"color"?: string,"in_week"?: boolean,"joined_at"?: string,"pinned"?: boolean,"user_id": string
                  }
                  Update: {
                    "allow_cheers"?: boolean,"circle_id"?: string,"closer"?: boolean,"color"?: string,"in_week"?: boolean,"joined_at"?: string,"pinned"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "circle_members_circle_id_fkey"
      columns: ["circle_id"]
isOneToOne: false
      referencedRelation: "circles"
      referencedColumns: ["id"]
    }
                  ]
                },"circles": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"name": string,"owner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"name": string,"owner_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"name"?: string,"owner_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"contact_messages": {
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
                },"habit_share_overrides": {
                  Row: {
                    "circle_id": string,"habit_id": string,"label": string,"level": string,"viewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "circle_id": string,"habit_id": string,"label"?: string,"level": string,"viewer_id": string
                  }
                  Update: {
                    "circle_id"?: string,"habit_id"?: string,"label"?: string,"level"?: string,"viewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_share_overrides_circle_id_fkey"
      columns: ["circle_id"]
isOneToOne: false
      referencedRelation: "circles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habit_share_overrides_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_shares": {
                  Row: {
                    "circle_id": string,"habit_id": string,"label": string,"level": string,"shows_misses": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "circle_id": string,"habit_id": string,"label"?: string,"level": string,"shows_misses"?: boolean
                  }
                  Update: {
                    "circle_id"?: string,"habit_id"?: string,"label"?: string,"level"?: string,"shows_misses"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_shares_circle_id_fkey"
      columns: ["circle_id"]
isOneToOne: false
      referencedRelation: "circles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habit_shares_habit_id_fkey"
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
                },"login_failures": {
                  Row: {
                    "at": string,"tag": string
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"tag": string
                  }
                  Update: {
                    "at"?: string,"tag"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "accent": string | null,"accent_custom": string | null,"avatar_color": string | null,"avatar_kind": string,"avatar_url": string | null,"avatar_value": string | null,"circles_paused": boolean,"created_at": string,"display_name": string | null,"password_set": boolean,"registered_at": string | null,"sound_id": string,"sound_volume": number,"tag": string,"timezone": string,"user_id": string,"week_starts_on": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"accent_custom"?: string | null,"avatar_color"?: string | null,"avatar_kind"?: string,"avatar_url"?: string | null,"avatar_value"?: string | null,"circles_paused"?: boolean,"created_at"?: string,"display_name"?: string | null,"password_set"?: boolean,"registered_at"?: string | null,"sound_id"?: string,"sound_volume"?: number,"tag": string,"timezone"?: string,"user_id": string,"week_starts_on"?: number
                  }
                  Update: {
                    "accent"?: string | null,"accent_custom"?: string | null,"avatar_color"?: string | null,"avatar_kind"?: string,"avatar_url"?: string | null,"avatar_value"?: string | null,"circles_paused"?: boolean,"created_at"?: string,"display_name"?: string | null,"password_set"?: boolean,"registered_at"?: string | null,"sound_id"?: string,"sound_volume"?: number,"tag"?: string,"timezone"?: string,"user_id"?: string,"week_starts_on"?: number
                  }
                  Relationships: [
                    
                  ]
                },"reactions": {
                  Row: {
                    "circle_id": string,"created_at": string,"emoji": string,"for_date": string,"from_user": string,"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "circle_id": string,"created_at"?: string,"emoji": string,"for_date": string,"from_user": string,"to_user": string
                  }
                  Update: {
                    "circle_id"?: string,"created_at"?: string,"emoji"?: string,"for_date"?: string,"from_user"?: string,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reactions_circle_id_fkey"
      columns: ["circle_id"]
isOneToOne: false
      referencedRelation: "circles"
      referencedColumns: ["id"]
    }
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
"circle_invite_preview":
{ Args: { "p_token": string }; Returns: Json
                           },
"circle_overview":
{ Args: { "p_circle": string }; Returns: Json
                           },
"create_circle":
{ Args: { "p_name": string }; Returns: string
                           },
"create_habit":
{ Args: { "p_color": string,"p_description": string,"p_icon": string,"p_kind": string,"p_name": string,"p_start_date": string,"p_times_per_week": number }; Returns: string
                           } |
{ Args: { "p_color": string,"p_description": string,"p_icon": string,"p_kind": string,"p_name": string,"p_start_date": string,"p_times_per_week": number,"p_weekdays": (number)[] }; Returns: string
                           },
"create_invite":
{ Args: { "p_circle": string }; Returns: string
                           },
"create_pair":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_circle":
{ Args: { "p_circle": string }; Returns: undefined
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"free_tag":
{ Args: { "p_base": string }; Returns: string
                           },
"is_circle_member":
{ Args: { "p_circle": string }; Returns: boolean
                           },
"join_circle":
{ Args: { "p_token": string }; Returns: string
                           },
"leave_circle":
{ Args: { "p_circle": string }; Returns: undefined
                           },
"login_email":
{ Args: { "p_password": string,"p_tag": string }; Returns: {
              "email": string,"locked": boolean
            }[]
                           },
"my_circles":
{ Args: Record<PropertyKey, never>; Returns: {
              "color": string,"id": string,"is_owner": boolean,"kind": string,"member_count": number,"name": string,"partner_name": string,"partner_tag": string,"pinned": boolean
            }[]
                           },
"react":
{ Args: { "p_circle": string,"p_emoji": string,"p_for": string,"p_on": boolean,"p_to": string }; Returns: undefined
                           },
"remove_member":
{ Args: { "p_circle": string,"p_user": string }; Returns: undefined
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
"set_circle_look":
{ Args: { "p_circle": string,"p_color": string,"p_pinned": boolean }; Returns: undefined
                           },
"set_circle_prefs":
{ Args: { "p_allow_cheers": boolean,"p_circle": string,"p_in_week": boolean }; Returns: undefined
                           },
"set_closer":
{ Args: { "p_circle": string,"p_on": boolean }; Returns: undefined
                           },
"set_completion":
{ Args: { "p_date": string,"p_done": boolean,"p_habit_id": string,"p_today": string }; Returns: undefined
                           },
"set_share":
{ Args: { "p_circle": string,"p_habit": string,"p_label"?: string,"p_level": string }; Returns: undefined
                           },
"set_share_misses":
{ Args: { "p_circle": string,"p_habit": string,"p_on": boolean }; Returns: undefined
                           },
"set_share_override":
{ Args: { "p_circle": string,"p_habit": string,"p_label"?: string,"p_level": string,"p_viewer": string }; Returns: undefined
                           },
"sync_delete_focus":
{ Args: { "p_id": string }; Returns: undefined
                           },
"sync_delete_habit":
{ Args: { "p_id": string }; Returns: undefined
                           },
"sync_put_focus":
{ Args: { "p_session": Json }; Returns: undefined
                           },
"sync_put_habit":
{ Args: { "p_habit": Json }; Returns: undefined
                           },
"tag_available":
{ Args: { "p_tag": string }; Returns: boolean
                           },
"valid_focus_plan":
{ Args: { "p_plan": Json }; Returns: boolean
                           },
"valid_tag":
{ Args: { "p_tag": string }; Returns: boolean
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
