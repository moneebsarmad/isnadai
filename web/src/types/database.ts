// Auto-generated types for isnad.ai database schema
// Run `npx supabase gen types typescript --project-id ucuxnowyaxbjqoyqammg > src/types/database.ts`
// after applying the schema migration to regenerate these types.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      custom_source_books: {
        Row: {
          id: string
          user_id: string
          name: string
          code: string
          author: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          code: string
          author?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          code?: string
          author?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      hadith_studies: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      versions: {
        Row: {
          id: string
          study_id: string
          source_book: string
          source_book_code: string | null
          source_book_author: string | null
          source_reference: string | null
          raw_text: string
          isnad_text: string | null
          matan_text: string | null
          matan_intro_phrase: string | null
          narrative_text: string | null
          post_matan_commentary: string | null
          boundary_type: string | null
          boundary_confidence: number | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          study_id: string
          source_book: string
          source_book_code?: string | null
          source_book_author?: string | null
          source_reference?: string | null
          raw_text: string
          isnad_text?: string | null
          matan_text?: string | null
          matan_intro_phrase?: string | null
          narrative_text?: string | null
          post_matan_commentary?: string | null
          boundary_type?: string | null
          boundary_confidence?: number | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          study_id?: string
          source_book?: string
          source_book_code?: string | null
          source_book_author?: string | null
          source_reference?: string | null
          raw_text?: string
          isnad_text?: string | null
          matan_text?: string | null
          matan_intro_phrase?: string | null
          narrative_text?: string | null
          post_matan_commentary?: string | null
          boundary_type?: string | null
          boundary_confidence?: number | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      narrator_mentions: {
        Row: {
          id: string
          version_id: string
          position: number
          narrator_name_original: string
          narrator_name_normalized: string
          transmission_phrase: string | null
          transmission_mode: string | null
          transmission_strength: string | null
          has_clarification: boolean
          clarification_text: string | null
          editorial_note: string | null
          is_parallel: boolean
          parallel_names: string[] | null
          resolved_narrator_key: string | null
          match_method: string
          created_at: string
        }
        Insert: {
          id?: string
          version_id: string
          position: number
          narrator_name_original: string
          narrator_name_normalized: string
          transmission_phrase?: string | null
          transmission_mode?: string | null
          transmission_strength?: string | null
          has_clarification?: boolean
          clarification_text?: string | null
          editorial_note?: string | null
          is_parallel?: boolean
          parallel_names?: string[] | null
          resolved_narrator_key?: string | null
          match_method?: string
          created_at?: string
        }
        Update: {
          id?: string
          version_id?: string
          position?: number
          narrator_name_original?: string
          narrator_name_normalized?: string
          transmission_phrase?: string | null
          transmission_mode?: string | null
          transmission_strength?: string | null
          has_clarification?: boolean
          clarification_text?: string | null
          editorial_note?: string | null
          is_parallel?: boolean
          parallel_names?: string[] | null
          resolved_narrator_key?: string | null
          match_method?: string
          created_at?: string
        }
      }
      study_narrators: {
        Row: {
          id: string
          study_id: string
          narrator_key: string
          canonical_name: string
          name_variants: string[]
          notes: string | null
          display_color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          study_id: string
          narrator_key: string
          canonical_name: string
          name_variants?: string[]
          notes?: string | null
          display_color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          study_id?: string
          narrator_key?: string
          canonical_name?: string
          name_variants?: string[]
          notes?: string | null
          display_color?: string | null
          created_at?: string
        }
      }
      narrator_resolutions: {
        Row: {
          id: string
          user_id: string
          narrator_text_normalized: string
          resolved_canonical_name: string
          resolution_count: number
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          narrator_text_normalized: string
          resolved_canonical_name: string
          resolution_count?: number
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          narrator_text_normalized?: string
          resolved_canonical_name?: string
          resolution_count?: number
          last_used_at?: string
          created_at?: string
        }
      }
      source_book_colors: {
        Row: {
          id: string
          user_id: string
          book_code: string
          book_name: string
          color_hex: string
        }
        Insert: {
          id?: string
          user_id: string
          book_code: string
          book_name: string
          color_hex?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_code?: string
          book_name?: string
          color_hex?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      seed_default_colors: {
        Args: Record<string, never>
        Returns: undefined
      }
      update_updated_at: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
