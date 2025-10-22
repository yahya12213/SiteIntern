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
      profiles: {
        Row: {
          id: string
          username: string
          password: string
          full_name: string
          role: 'admin' | 'professor'
          created_at: string
        }
        Insert: {
          id: string
          username: string
          password: string
          full_name: string
          role: 'admin' | 'professor'
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          full_name?: string
          role?: 'admin' | 'professor'
          created_at?: string
        }
      }
      segments: {
        Row: {
          id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          created_at?: string
        }
      }
      cities: {
        Row: {
          id: string
          name: string
          segment_id: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          segment_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          segment_id?: string
          created_at?: string
        }
      }
      professor_segments: {
        Row: {
          professor_id: string
          segment_id: string
        }
        Insert: {
          professor_id: string
          segment_id: string
        }
        Update: {
          professor_id?: string
          segment_id?: string
        }
      }
      professor_cities: {
        Row: {
          professor_id: string
          city_id: string
        }
        Insert: {
          professor_id: string
          city_id: string
        }
        Update: {
          professor_id?: string
          city_id?: string
        }
      }
      calculation_sheets: {
        Row: {
          id: string
          title: string
          template_data: string
          status: 'draft' | 'published'
          sheet_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          title: string
          template_data: string
          status?: 'draft' | 'published'
          sheet_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          template_data?: string
          status?: 'draft' | 'published'
          sheet_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      calculation_sheet_segments: {
        Row: {
          sheet_id: string
          segment_id: string
        }
        Insert: {
          sheet_id: string
          segment_id: string
        }
        Update: {
          sheet_id?: string
          segment_id?: string
        }
      }
      calculation_sheet_cities: {
        Row: {
          sheet_id: string
          city_id: string
        }
        Insert: {
          sheet_id: string
          city_id: string
        }
        Update: {
          sheet_id?: string
          city_id?: string
        }
      }
      professor_declarations: {
        Row: {
          id: string
          professor_id: string
          calculation_sheet_id: string
          segment_id: string
          city_id: string
          start_date: string
          end_date: string
          form_data: string
          status: 'brouillon' | 'soumise' | 'en_cours' | 'approuvee' | 'refusee'
          rejection_reason: string | null
          created_at: string
          updated_at: string
          submitted_at: string | null
          reviewed_at: string | null
        }
        Insert: {
          id: string
          professor_id: string
          calculation_sheet_id: string
          segment_id: string
          city_id: string
          start_date: string
          end_date: string
          form_data?: string
          status?: 'brouillon' | 'soumise' | 'en_cours' | 'approuvee' | 'refusee'
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
          submitted_at?: string | null
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          professor_id?: string
          calculation_sheet_id?: string
          segment_id?: string
          city_id?: string
          start_date?: string
          end_date?: string
          form_data?: string
          status?: 'brouillon' | 'soumise' | 'en_cours' | 'approuvee' | 'refusee'
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
          submitted_at?: string | null
          reviewed_at?: string | null
        }
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
  }
}
