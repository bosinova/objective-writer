import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export type ItemType = 'objective' | 'outline' | 'scoping' | 'assessment' | 'note'

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface SavedItem {
  id: string
  user_id: string
  project_id: string
  type: ItemType
  title: string
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)