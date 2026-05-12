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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          present: boolean
          student_id: string
          training_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          present?: boolean
          student_id: string
          training_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          present?: boolean
          student_id?: string
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      comandas: {
        Row: {
          id: string
          user_id: string
          business_type: string
          name: string
          status: string
          created_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          business_type?: string
          name: string
          status?: string
          created_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          business_type?: string
          name?: string
          status?: string
          created_at?: string
          closed_at?: string | null
        }
        Relationships: []
      }
      comanda_items: {
        Row: {
          id: string
          user_id: string
          comanda_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comanda_id?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
          total: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comanda_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          total?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comanda_items_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          id: string
          user_id: string
          name: string
          schedule: Json
          location: string
          modality_id: string | null
          max_students: number | null
          duration_minutes: number
          color: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          schedule?: Json
          location?: string
          modality_id?: string | null
          max_students?: number | null
          duration_minutes?: number
          color?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          schedule?: Json
          location?: string
          modality_id?: string | null
          max_students?: number | null
          duration_minutes?: number
          color?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          }
        ]
      }
      group_students: {
        Row: {
          id: string
          group_id: string
          student_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          student_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          student_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
      modalities: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          business_type: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          business_type?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string | null
          business_type?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          full_price: number | null
          id: string
          is_prorata: boolean
          month_ref: string
          paid: boolean
          paid_at: string | null
          plan_id: string
          student_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          full_price?: number | null
          id?: string
          is_prorata?: boolean
          month_ref: string
          paid?: boolean
          paid_at?: string | null
          plan_id: string
          student_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          full_price?: number | null
          id?: string
          is_prorata?: boolean
          month_ref?: string
          paid?: boolean
          paid_at?: string | null
          plan_id?: string
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_type: string
          created_at: string
          id: string
          name: string
          price: number
          sessions_per_week: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_type?: string
          created_at?: string
          id?: string
          name: string
          price?: number
          sessions_per_week?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_type?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          sessions_per_week?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          category: string
          date: string
          paid: boolean
          paid_at: string | null
          recurrence: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          amount: number
          category?: string
          date?: string
          paid?: boolean
          paid_at?: string | null
          recurrence?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          amount?: number
          category?: string
          date?: string
          paid?: boolean
          paid_at?: string | null
          recurrence?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          price: number
          category: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          price: number
          category?: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          price?: number
          category?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          ct_name: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          business_type: string
          onboarding_completed: boolean | null
          created_at: string
          updated_at: string
          pix_key: string | null
          pix_receiver: string | null
          niche_settings: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          ct_name?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          business_type?: string
          onboarding_completed?: boolean | null
          created_at?: string
          updated_at?: string
          pix_key?: string | null
          pix_receiver?: string | null
          niche_settings?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          ct_name?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          business_type?: string
          onboarding_completed?: boolean | null
          created_at?: string
          updated_at?: string
          pix_key?: string | null
          pix_receiver?: string | null
          niche_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          total: number
          payment_method: string
          sold_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
          total: number
          payment_method?: string
          sold_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          total?: number
          payment_method?: string
          sold_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      students: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          join_date: string
          level: string
          name: string
          payment_due_day: number | null
          phone: string
          photo: string | null
          plan_id: string | null
          updated_at: string
          user_id: string
          cpf: string | null
          rg: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          is_trial: boolean
          trial_started_at: string | null
          trial_converted_at: string | null
          category_id: string | null
          modality_id: string | null
          business_type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          join_date?: string
          level?: string
          name: string
          payment_due_day?: number | null
          phone?: string
          photo?: string | null
          plan_id?: string | null
          updated_at?: string
          user_id: string
          cpf?: string | null
          rg?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          is_trial?: boolean
          trial_started_at?: string | null
          trial_converted_at?: string | null
          category_id?: string | null
          modality_id?: string | null
          business_type?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          join_date?: string
          level?: string
          name?: string
          payment_due_day?: number | null
          phone?: string
          photo?: string | null
          plan_id?: string | null
          updated_at?: string
          user_id?: string
          cpf?: string | null
          rg?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          is_trial?: boolean
          trial_started_at?: string | null
          trial_converted_at?: string | null
          category_id?: string | null
          modality_id?: string | null
          business_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_students: {
        Row: {
          id: string
          student_id: string
          training_id: string
        }
        Insert: {
          id?: string
          student_id: string
          training_id: string
        }
        Update: {
          id?: string
          student_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_students_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string
          notes: string | null
          time: string
          updated_at: string
          user_id: string
          duration_minutes: number
          business_type: string
          category_id: string | null
          modality_id: string | null
          completed: boolean
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          location?: string
          notes?: string | null
          time: string
          updated_at?: string
          user_id: string
          duration_minutes?: number
          business_type?: string
          category_id?: string | null
          modality_id?: string | null
          completed?: boolean
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string
          notes?: string | null
          time?: string
          updated_at?: string
          user_id?: string
          duration_minutes?: number
          business_type?: string
          category_id?: string | null
          modality_id?: string | null
          completed?: boolean
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
