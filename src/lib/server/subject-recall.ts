import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";

export function recallClient(admin = false) {
  const url = process.env.SUPABASE_URL;
  const key = admin ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error(admin
    ? "Configure SUPABASE_SERVICE_ROLE_KEY on the server to manage subject notes."
    : "Subject notes are being set up. Please try again later.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function isRecallAdmin() {
  const token = (await cookies()).get(getAdminCookieName())?.value;
  return verifyAdminSessionToken(token);
}

export function recallError(error: unknown) {
  return error instanceof Error ? error.message : "Subject notes are not available. Please try again.";
}
