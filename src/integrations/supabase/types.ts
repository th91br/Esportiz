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
          business_type: string
          created_at: string
          date: string
          id: string
          present: boolean
          student_id: string
          training_id: string
          user_id: string
        }
        Insert: {
          business_type?: string
          created_at?: string
          date: string
          id?: string
          present?: boolean
          student_id: string
          training_id: string
          user_id: string
        }
        Update: {
          business_type?: string
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
      financial_audit_logs: {
        Row: {
          action: string
          business_type: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          new_state: Json
          previous_state: Json
          source: string
          user_id: string
        }
        Insert: {
          action: string
          business_type: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          source?: string
          user_id: string
        }
        Update: {
          action?: string
          business_type?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          new_state?: Json
          previous_state?: Json
          source?: string
          user_id?: string
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
          business_type: string
          created_at: string
          due_date: string
          full_price: number | null
          id: string
          is_prorata: boolean
          month_ref: string
          paid: boolean
          paid_amount: number
          paid_at: string | null
          plan_id: string
          student_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          business_type?: string
          created_at?: string
          due_date: string
          full_price?: number | null
          id?: string
          is_prorata?: boolean
          month_ref: string
          paid?: boolean
          paid_amount?: number
          paid_at?: string | null
          plan_id: string
          student_id: string
          user_id: string
        }
        Update: {
          amount?: number
          business_type?: string
          created_at?: string
          due_date?: string
          full_price?: number | null
          id?: string
          is_prorata?: boolean
          month_ref?: string
          paid?: boolean
          paid_amount?: number
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
          business_type: string
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
          business_type?: string
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
          business_type?: string
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
          business_type: string
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
          business_type?: string
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
          business_type?: string
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
          business_type: string
          name: string
          price: number
          category: string
          active: boolean
          track_stock: boolean
          stock_quantity: number
          min_stock: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_type?: string
          name: string
          price: number
          category?: string
          active?: boolean
          track_stock?: boolean
          stock_quantity?: number
          min_stock?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_type?: string
          name?: string
          price?: number
          category?: string
          active?: boolean
          track_stock?: boolean
          stock_quantity?: number
          min_stock?: number
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
          google_access_token: string | null
          google_refresh_token: string | null
          google_calendar_id: string | null
          sheets_spreadsheet_id: string | null
          sheets_webhook_active: boolean | null
          created_at: string
          updated_at: string
          pix_key: string | null
          pix_receiver: string | null
          niche_settings: Record<string, unknown> | null
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
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_calendar_id?: string | null
          sheets_spreadsheet_id?: string | null
          sheets_webhook_active?: boolean | null
          created_at?: string
          updated_at?: string
          pix_key?: string | null
          pix_receiver?: string | null
          niche_settings?: Record<string, unknown> | null
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
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_calendar_id?: string | null
          sheets_spreadsheet_id?: string | null
          sheets_webhook_active?: boolean | null
          created_at?: string
          updated_at?: string
          pix_key?: string | null
          pix_receiver?: string | null
          niche_settings?: Record<string, unknown> | null
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
          business_type: string
          comanda_id: string | null
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
          business_type?: string
          comanda_id?: string | null
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
          business_type?: string
          comanda_id?: string | null
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
          birth_date: string | null
          business_type: string
          category_id: string | null
          created_at: string
          cpf: string | null
          discount_duration_months: number | null
          discount_start_month: string | null
          discount_type: string | null
          discount_value: number
          email: string
          id: string
          is_trial: boolean
          join_date: string
          level: string
          name: string
          payment_due_day: number | null
          payment_start_date: string | null
          phone: string
          photo: string | null
          plan_id: string | null
          modality_id: string | null
          rg: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          trial_started_at: string | null
          trial_converted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          business_type?: string
          category_id?: string | null
          created_at?: string
          cpf?: string | null
          discount_duration_months?: number | null
          discount_start_month?: string | null
          discount_type?: string | null
          discount_value?: number
          email?: string
          id?: string
          is_trial?: boolean
          join_date?: string
          level?: string
          name: string
          payment_due_day?: number | null
          payment_start_date?: string | null
          phone?: string
          photo?: string | null
          plan_id?: string | null
          modality_id?: string | null
          rg?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          trial_started_at?: string | null
          trial_converted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          business_type?: string
          category_id?: string | null
          created_at?: string
          cpf?: string | null
          discount_duration_months?: number | null
          discount_start_month?: string | null
          discount_type?: string | null
          discount_value?: number
          email?: string
          id?: string
          is_trial?: boolean
          join_date?: string
          level?: string
          name?: string
          payment_due_day?: number | null
          payment_start_date?: string | null
          phone?: string
          photo?: string | null
          plan_id?: string | null
          modality_id?: string | null
          rg?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          trial_started_at?: string | null
          trial_converted_at?: string | null
          updated_at?: string
          user_id?: string
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
          user_id: string | null
        }
        Insert: {
          id?: string
          student_id: string
          training_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          training_id?: string
          user_id?: string | null
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
          completed_at: string | null
          google_event_id: string | null
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
          completed_at?: string | null
          google_event_id?: string | null
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
          completed_at?: string | null
          google_event_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_comanda_atomic: {
        Args: {
          p_comanda_id: string
          p_payment_method: string
          p_user_id: string
        }
        Returns: {
          closed_at?: string
          sales_count?: number
          success: boolean
          total_amount?: number
        }
      }
      cleanup_student_future_trainings: {
        Args: {
          p_student_id: string
        }
        Returns: number
      }
      delete_sale_and_restore_stock: {
        Args: {
          p_sale_id: string
          p_user_id: string
        }
        Returns: {
          success: boolean
        }
      }
      generate_monthly_payments: {
        Args: {
          p_month_ref: string
        }
        Returns: number
      }
      receive_payment_atomic: {
        Args: {
          p_payment_id: string
          p_paid_amount?: number | null
        }
        Returns: Json
      }
      reopen_payment_atomic: {
        Args: {
          p_payment_id: string
        }
        Returns: Json
      }
      cancel_payment_atomic: {
        Args: {
          p_payment_id: string
        }
        Returns: Json
      }
      receive_payments_batch_atomic: {
        Args: {
          p_payment_ids: string[]
        }
        Returns: Json
      }
      reopen_payments_batch_atomic: {
        Args: {
          p_payment_ids: string[]
        }
        Returns: Json
      }
      cancel_student_open_payments_atomic: {
        Args: {
          p_student_id: string
        }
        Returns: number
      }
      generate_student_schedule: {
        Args: {
          p_months_ahead?: number
          p_schedules: Json
          p_student_id: string
          p_user_id: string
        }
        Returns: {
          message?: string
          success: boolean
        }
      }
      get_public_arena_data: {
        Args: {
          p_user_id: string
        }
        Returns: {
          arena_name: string
          courts: {
            color: string | null
            id: string
            metadata: Json | null
            name: string
          }[]
          reservations: {
            courtId: string
            date: string
            durationMinutes: number
            id: string
            status: string
            time: string
          }[]
        }
      }
      get_public_enrollment_data: {
        Args: {
          p_user_id: string
        }
        Returns: {
          enabled: boolean
          error?: string
          success: boolean
        }
      }
      get_student_portal_data: {
        Args: {
          p_birth_date?: string | null
          p_cpf?: string | null
          p_user_id?: string | null
        }
        Returns: {
          attendance_logs?: {
            date: string
            notes?: string | null
            status: "present" | "absent"
          }[]
          attendance_stats?: {
            absences: number
            percent: number
            presences: number
            total_classes: number
          }
          authenticated: boolean
          payment_config?: {
            pix_key: string | null
            pix_receiver: string | null
          }
          groups?: {
            id: string
            location?: string | null
            name: string
            schedule: {
              day: string
              endTime: string
              startTime: string
            }[]
          }[]
          payments?: {
            amount: number
            due_date: string
            id: string
            month_ref: string
            paid: boolean
            paid_amount: number
            paid_at: string | null
          }[]
          student?: {
            id: string
            name: string
            plan_name: string
            school_name: string
          }
        }
      }
      process_sale: {
        Args: {
          p_business_type?: string
          p_payment_method: string
          p_product_id: string | null
          p_product_name: string
          p_quantity: number
          p_total: number
          p_unit_price: number
          p_user_id: string
        }
        Returns: {
          calculated_total?: number
          sale_id?: string
          success: boolean
        }
      }
      reopen_comanda_atomic: {
        Args: {
          p_comanda_id: string
          p_user_id: string
        }
        Returns: {
          restored_quantity?: number
          sales_count?: number
          success: boolean
        }
      }
      is_valid_cpf: {
        Args: {
          p_cpf: string | null
        }
        Returns: boolean
      }
      submit_public_enrollment: {
        Args: {
          p_birth_date: string
          p_cpf: string
          p_email: string
          p_group_id: string | null
          p_name: string
          p_phone: string
          p_plan_id: string
          p_user_id: string
        }
        Returns: {
          enabled?: boolean
          error?: string
          success: boolean
        }
      }
      submit_public_reservation: {
        Args: {
          p_client_cpf: string
          p_client_email: string
          p_client_name: string
          p_client_phone: string
          p_court_id: string
          p_date: string
          p_duration_minutes: number
          p_time: string
          p_user_id: string
        }
        Returns: {
          conflict?: boolean
          error?: string
          message?: string
          reservation_id?: string
          success: boolean
        }
      }
      set_arena_reservation_payment_status_atomic: {
        Args: {
          p_payment_method?: string | null
          p_payment_status: string
          p_reservation_id: string
        }
        Returns: Json
      }
      sync_all_unpaid_payments_for_plan: {
        Args: {
          p_plan_id: string
        }
        Returns: void
      }
      sync_student_unpaid_payments: {
        Args: {
          p_new_due_day: number | null
          p_new_plan_id: string | null
          p_plan_changed: boolean
          p_student_id: string
        }
        Returns: void
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
