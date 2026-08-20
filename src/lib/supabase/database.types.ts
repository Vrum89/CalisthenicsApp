/**
 * Tipi del database (snake_case), rispecchiano `supabase/schema.sql`.
 *
 * Scritti a mano perche' `supabase gen types typescript` richiede accesso al
 * progetto. Struttura identica a quella generata dalla CLI, quindi il file si
 * puo' rimpiazzare 1:1 dopo aver applicato lo schema:
 *
 *   npx supabase login
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 *
 * Non usare questi tipi fuori dal data-access layer: l'app parla camelCase
 * (`src/domain/types.ts`), la traduzione sta in `mappers.ts`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          metric_type: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category: string;
          metric_type: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string;
          metric_type?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      program_days: {
        Row: {
          id: string;
          user_id: string;
          program_id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_id: string;
          name: string;
          sort_order: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          program_id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'program_days_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      program_exercises: {
        Row: {
          id: string;
          user_id: string;
          program_day_id: string;
          exercise_id: string;
          sort_order: number;
          default_scheme: string | null;
          default_weight_kg: number | null;
          superset_key: string | null;
          superset_order: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_day_id: string;
          exercise_id: string;
          sort_order: number;
          default_scheme?: string | null;
          default_weight_kg?: number | null;
          superset_key?: string | null;
          superset_order?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          program_day_id?: string;
          exercise_id?: string;
          sort_order?: number;
          default_scheme?: string | null;
          default_weight_kg?: number | null;
          superset_key?: string | null;
          superset_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'program_exercises_program_day_id_fkey';
            columns: ['program_day_id'];
            isOneToOne: false;
            referencedRelation: 'program_days';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'program_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_date: string;
          workout_type: string;
          program_day_id: string | null;
          original_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_date: string;
          workout_type: string;
          program_day_id?: string | null;
          original_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_date?: string;
          workout_type?: string;
          program_day_id?: string | null;
          original_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workouts_program_day_id_fkey';
            columns: ['program_day_id'];
            isOneToOne: false;
            referencedRelation: 'program_days';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_exercises: {
        Row: {
          id: string;
          user_id: string;
          workout_id: string;
          exercise_id: string;
          sort_order: number;
          scheme: string | null;
          reps_per_set: number[] | null;
          metric_value: number | null;
          added_weight_kg: number | null;
          variant: string | null;
          notes: string | null;
          is_excluded: boolean;
          exclusion_reason: string | null;
          superset_key: string | null;
          superset_order: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_id: string;
          exercise_id: string;
          sort_order: number;
          scheme?: string | null;
          reps_per_set?: number[] | null;
          metric_value?: number | null;
          added_weight_kg?: number | null;
          variant?: string | null;
          notes?: string | null;
          is_excluded?: boolean;
          exclusion_reason?: string | null;
          superset_key?: string | null;
          superset_order?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_id?: string;
          exercise_id?: string;
          sort_order?: number;
          scheme?: string | null;
          reps_per_set?: number[] | null;
          metric_value?: number | null;
          added_weight_kg?: number | null;
          variant?: string | null;
          notes?: string | null;
          is_excluded?: boolean;
          exclusion_reason?: string | null;
          superset_key?: string | null;
          superset_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      body_weights: {
        Row: {
          id: string;
          user_id: string;
          measured_on: string;
          weight_kg: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          measured_on: string;
          weight_kg: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          measured_on?: string;
          weight_kg?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      seed_default_exercises: {
        Args: { target_user: string };
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
