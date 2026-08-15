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
      billing_reports: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          pdf_path: string
          session_ids: string[]
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          pdf_path: string
          session_ids: string[]
          total: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          pdf_path?: string
          session_ids?: string[]
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_contacts: {
        Row: {
          created_at: string
          id: string
          nome: string
          patient_id: string
          relacao: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          patient_id: string
          relacao?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          patient_id?: string
          relacao?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_payments: {
        Row: {
          created_at: string
          data: string
          id: string
          observacao: string | null
          patient_id: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          patient_id: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          patient_id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          ap_historico: string | null
          created_at: string
          custo_sessao: number | null
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          queixa_principal: string | null
          telefone: string | null
          template_atendimentos_realizados: string | null
          template_estado_geral: string | null
          template_observacoes_evolucoes: string | null
          template_sinais_vitais: string | null
          updated_at: string
          user_id: string
          valor_sessao: number | null
        }
        Insert: {
          ap_historico?: string | null
          created_at?: string
          custo_sessao?: number | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          queixa_principal?: string | null
          telefone?: string | null
          template_atendimentos_realizados?: string | null
          template_estado_geral?: string | null
          template_observacoes_evolucoes?: string | null
          template_sinais_vitais?: string | null
          updated_at?: string
          user_id: string
          valor_sessao?: number | null
        }
        Update: {
          ap_historico?: string | null
          created_at?: string
          custo_sessao?: number | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          queixa_principal?: string | null
          telefone?: string | null
          template_atendimentos_realizados?: string | null
          template_estado_geral?: string | null
          template_observacoes_evolucoes?: string | null
          template_sinais_vitais?: string | null
          updated_at?: string
          user_id?: string
          valor_sessao?: number | null
        }
        Relationships: []
      }
      professional_profile: {
        Row: {
          agencia: string | null
          banco: string | null
          chave_pix: string | null
          conta: string | null
          created_at: string
          crefito: string | null
          lgpd_aceite_em: string | null
          nome: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          conta?: string | null
          created_at?: string
          crefito?: string | null
          lgpd_aceite_em?: string | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          conta?: string | null
          created_at?: string
          crefito?: string | null
          lgpd_aceite_em?: string | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          custo_registrado: number | null
          duration_min: number
          id: string
          lembrete_enviado: boolean
          notes_evolucao: string | null
          pago: boolean
          pago_em: string | null
          pago_via: string | null
          patient_id: string
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
          valor_cobrado: number | null
        }
        Insert: {
          created_at?: string
          custo_registrado?: number | null
          duration_min?: number
          id?: string
          lembrete_enviado?: boolean
          notes_evolucao?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_via?: string | null
          patient_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
          valor_cobrado?: number | null
        }
        Update: {
          created_at?: string
          custo_registrado?: number | null
          duration_min?: number
          id?: string
          lembrete_enviado?: boolean
          notes_evolucao?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_via?: string | null
          patient_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor_cobrado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          mp_preapproval_id: string | null
          plano: string | null
          status: string
          trial_ends_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          mp_preapproval_id?: string | null
          plano?: string | null
          status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          mp_preapproval_id?: string | null
          plano?: string | null
          status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      treatment_exercises: {
        Row: {
          created_at: string
          id: string
          nome: string
          observacao: string | null
          plan_id: string
          series_reps: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          observacao?: string | null
          plan_id: string
          series_reps?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          observacao?: string | null
          plan_id?: string
          series_reps?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          created_at: string
          id: string
          objetivos: string | null
          patient_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objetivos?: string | null
          patient_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          objetivos?: string | null
          patient_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_subscription: { Args: { _user_id: string }; Returns: undefined }
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
