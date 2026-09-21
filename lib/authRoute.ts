// Shared by the API routes: who is calling? Verified against Supabase with the caller's own token, and the
// returned client acts AS that person (so row-level security still applies to anything the route reads).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface Caller {
  userId: string;
  sb: SupabaseClient;
}

export async function callerOf(req: Request): Promise<Caller | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return null;
  const sb = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await sb.auth.getUser(token);
  return error || !data.user ? null : { userId: data.user.id, sb };
}
