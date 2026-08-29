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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          kind: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          capability: string
          created_at: string
          error_message: string | null
          id: string
          model: string | null
          provider: string
          success: boolean
          tokens_used: number
          user_id: string
        }
        Insert: {
          capability: string
          created_at?: string
          error_message?: string | null
          id?: string
          model?: string | null
          provider: string
          success?: boolean
          tokens_used?: number
          user_id: string
        }
        Update: {
          capability?: string
          created_at?: string
          error_message?: string | null
          id?: string
          model?: string | null
          provider?: string
          success?: boolean
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_notes: {
        Row: {
          content: string
          created_at: string
          difficulty: string
          id: string
          subject: string | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          difficulty?: string
          id?: string
          subject?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          difficulty?: string
          id?: string
          subject?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_study_plans: {
        Row: {
          content: string
          created_at: string
          daily_minutes: number
          exam_code: string
          id: string
          is_active: boolean
          target_date: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          daily_minutes?: number
          exam_code?: string
          id?: string
          is_active?: boolean
          target_date?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          daily_minutes?: number
          exam_code?: string
          id?: string
          is_active?: boolean
          target_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_goals: {
        Row: {
          goal_date: string
          id: string
          minutes_done: number
          minutes_goal: number
          question_goal: number
          questions_done: number
          user_id: string
        }
        Insert: {
          goal_date?: string
          id?: string
          minutes_done?: number
          minutes_goal?: number
          question_goal?: number
          questions_done?: number
          user_id: string
        }
        Update: {
          goal_date?: string
          id?: string
          minutes_done?: number
          minutes_goal?: number
          question_goal?: number
          questions_done?: number
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          code: string
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          is_active: boolean
          marks_correct: number
          marks_skipped: number
          marks_wrong: number
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          marks_correct?: number
          marks_skipped?: number
          marks_wrong?: number
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          marks_correct?: number
          marks_skipped?: number
          marks_wrong?: number
          name?: string
        }
        Relationships: []
      }
      practice_answers: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: string | null
          session_id: string
          time_taken_seconds: number
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_answer?: string | null
          session_id: string
          time_taken_seconds?: number
          user_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: string | null
          session_id?: string
          time_taken_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          correct_count: number
          difficulty: string | null
          exam_id: string | null
          id: string
          skipped_count: number
          started_at: string
          status: string
          subject_id: string | null
          time_spent_seconds: number
          topic_id: string | null
          total_questions: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number
          difficulty?: string | null
          exam_id?: string | null
          id?: string
          skipped_count?: number
          started_at?: string
          status?: string
          subject_id?: string | null
          time_spent_seconds?: number
          topic_id?: string | null
          total_questions?: number
          user_id: string
          wrong_count?: number
        }
        Update: {
          completed_at?: string | null
          correct_count?: number
          difficulty?: string | null
          exam_id?: string | null
          id?: string
          skipped_count?: number
          started_at?: string
          status?: string
          subject_id?: string | null
          time_spent_seconds?: number
          topic_id?: string | null
          total_questions?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number
          daily_minutes_goal: number
          daily_question_goal: number
          email: string | null
          full_name: string | null
          id: string
          last_active_date: string | null
          longest_streak: number
          plan_tier: string
          preferred_subjects: string[]
          study_level: string
          target_date: string | null
          target_exam_code: string
          target_year: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          daily_minutes_goal?: number
          daily_question_goal?: number
          email?: string | null
          full_name?: string | null
          id: string
          last_active_date?: string | null
          longest_streak?: number
          plan_tier?: string
          preferred_subjects?: string[]
          study_level?: string
          target_date?: string | null
          target_exam_code?: string
          target_year?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          daily_minutes_goal?: number
          daily_question_goal?: number
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number
          plan_tier?: string
          preferred_subjects?: string[]
          study_level?: string
          target_date?: string | null
          target_exam_code?: string
          target_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: string
          exam_id: string
          explanation: string | null
          id: string
          is_published: boolean
          options: Json
          question_text: string
          question_type: string
          source: string | null
          subject_id: string | null
          tags: string[]
          topic_id: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          exam_id: string
          explanation?: string | null
          id?: string
          is_published?: boolean
          options?: Json
          question_text: string
          question_type?: string
          source?: string | null
          subject_id?: string | null
          tags?: string[]
          topic_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          is_published?: boolean
          options?: Json
          question_text?: string
          question_type?: string
          source?: string | null
          subject_id?: string | null
          tags?: string[]
          topic_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_items: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          interval_days: number
          item_type: string
          last_reviewed_at: string | null
          next_review_date: string
          question_id: string | null
          review_count: number
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          interval_days?: number
          item_type?: string
          last_reviewed_at?: string | null
          next_review_date?: string
          question_id?: string | null
          review_count?: number
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          interval_days?: number
          item_type?: string
          last_reviewed_at?: string | null
          next_review_date?: string
          question_id?: string | null
          review_count?: number
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          activity: string
          created_at: string
          id: string
          minutes: number
          occurred_on: string
          user_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          id?: string
          minutes?: number
          occurred_on?: string
          user_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          id?: string
          minutes?: number
          occurred_on?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          exam_id: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          exam_id: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          exam_id?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      test_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean | null
          marked_for_review: boolean
          question_id: string
          selected_answer: string | null
          time_taken_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          question_id: string
          selected_answer?: string | null
          time_taken_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          question_id?: string
          selected_answer?: string | null
          time_taken_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          accuracy: number
          correct_count: number
          id: string
          max_marks: number
          score: number
          skipped_count: number
          started_at: string
          status: string
          submitted_at: string | null
          test_id: string
          time_spent_seconds: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          accuracy?: number
          correct_count?: number
          id?: string
          max_marks?: number
          score?: number
          skipped_count?: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id: string
          time_spent_seconds?: number
          user_id: string
          wrong_count?: number
        }
        Update: {
          accuracy?: number
          correct_count?: number
          id?: string
          max_marks?: number
          score?: number
          skipped_count?: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id?: string
          time_spent_seconds?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          id: string
          position: number
          question_id: string
          test_id: string
        }
        Insert: {
          id?: string
          position?: number
          question_id: string
          test_id: string
        }
        Update: {
          id?: string
          position?: number
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          exam_id: string
          id: string
          is_published: boolean
          subject_id: string | null
          test_type: string
          title: string
          topic_id: string | null
          total_questions: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          exam_id: string
          id?: string
          is_published?: boolean
          subject_id?: string | null
          test_type?: string
          title: string
          topic_id?: string | null
          total_questions?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          exam_id?: string
          id?: string
          is_published?: boolean
          subject_id?: string | null
          test_type?: string
          title?: string
          topic_id?: string | null
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "tests_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
