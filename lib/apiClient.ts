"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase/client";

/** Headers for our own API routes: your Supabase session token, so the server knows it's really you. */
export async function authHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {};
  const { data } = await getSupabase().auth.getSession();
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}
