import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Card = {
  id: string
  name: string
  set_name: string
  card_number: string | null
  image_url: string | null
  tcg_api_id: string | null
  created_at: string
}

export type PriceHistory = {
  id: string
  card_id: string
  price: number
  recorded_at: string
}