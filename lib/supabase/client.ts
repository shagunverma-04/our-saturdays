import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase now labels this the "publishable" key; the older name is "anon". Either works.
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when both public env vars are set. Without them the app runs in local demo mode. */
export const isSupabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/** Shared browser client. Uses only the public anon key — Row Level Security does the protecting. Never use the service-role key here. */
export function getSupabase(): SupabaseClient {
  if (!url || !anon) throw new Error("Supabase is not configured (see .env.example)");
  return (client ??= createBrowserClient(url, anon));
}
