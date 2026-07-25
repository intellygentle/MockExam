import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Client (lazy initialization)
 *
 * Fetches SUPABASE_URL and SUPABASE_ANON_KEY from a server API route
 * so we don't need NEXT_PUBLIC_ environment variables.
 */

let client: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (client) return client;

  if (!initPromise) {
    initPromise = (async () => {
      const res = await fetch("/api/supabase-config");
      if (!res.ok) {
        throw new Error(
          "Failed to load Supabase configuration. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env.local file."
        );
      }
      const config = await res.json();
      client = createClient(config.url, config.anonKey);
      return client;
    })();
  }

  return initPromise;
}
