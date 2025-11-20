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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bank_statements: {
        Row: {
          closing_balance: number | null
          created_at: string
          currency: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          opening_balance: number | null
          parsing_errors: string | null
          processed_at: string | null
          processing_status: string | null
          project_id: string | null
          statement_period_end: string | null
          statement_period_start: string | null
          total_amount: number | null
          total_transactions: number | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          closing_balance?: number | null
          created_at?: string
          currency?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          opening_balance?: number | null
          parsing_errors?: string | null
          processed_at?: string | null
          processing_status?: string | null
          project_id?: string | null
          statement_period_end?: string | null
          statement_period_start?: string | null
          total_amount?: number | null
          total_transactions?: number | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          closing_balance?: number | null
          created_at?: string
          currency?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          opening_balance?: number | null
          parsing_errors?: string | null
          processed_at?: string | null
          processing_status?: string | null
          project_id?: string | null
          statement_period_end?: string | null
          statement_period_start?: string | null
          total_amount?: number | null
          total_transactions?: number | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_rules: {
        Row: {
          category: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          id: string
          is_active: boolean | null
          keyword: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          id?: string
          is_active?: boolean | null
          keyword: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          id?: string
          is_active?: boolean | null
          keyword?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_predictions: {
        Row: {
          category: Database["public"]["Enums"]["transaction_category"] | null
          confidence_score: number | null
          generated_at: string
          id: string
          predicted_amount: number
          prediction_month: string
          project_id: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["transaction_category"] | null
          confidence_score?: number | null
          generated_at?: string
          id?: string
          predicted_amount: number
          prediction_month: string
          project_id: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["transaction_category"] | null
          confidence_score?: number | null
          generated_at?: string
          id?: string
          predicted_amount?: number
          prediction_month?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_reports: {
        Row: {
          generated_at: string
          id: string
          project_id: string
          report_data: Json
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          project_id: string
          report_data: Json
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          project_id?: string
          report_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          id: string
          last_request: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          id?: string
          last_request?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          id?: string
          last_request?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["transaction_category"] | null
          created_at: string
          description: string
          id: string
          is_debit: boolean | null
          merchant: string | null
          notes: string | null
          statement_id: string
          subcategory: string | null
          transaction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["transaction_category"] | null
          created_at?: string
          description: string
          id?: string
          is_debit?: boolean | null
          merchant?: string | null
          notes?: string | null
          statement_id: string
          subcategory?: string | null
          transaction_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"] | null
          created_at?: string
          description?: string
          id?: string
          is_debit?: boolean | null
          merchant?: string | null
          notes?: string | null
          statement_id?: string
          subcategory?: string | null
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      transaction_category:
        | "Travel"
        | "Education"
        | "Entertainment"
        | "Food"
        | "Miscellaneous"
        | "ATM"
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
    Enums: {
      transaction_category: [
        "Travel",
        "Education",
        "Entertainment",
        "Food",
        "Miscellaneous",
        "ATM",
      ],
    },
  },
} as const
