import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client Configuration
 * 
 * IMPORTANT: 
 * 1. Create a Supabase project at https://supabase.com
 * 2. Replace the placeholders below with your actual values from .env.local
 * 3. Never commit your real keys to Git
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
