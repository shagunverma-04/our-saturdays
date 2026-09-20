"use client";

// Who is using the app, and which private space they belong to.
//   local     – no Supabase env: demo mode, no login
//   loading   – checking for an existing session
//   signedOut – show the login screen
//   noCouple  – signed in, but not in a shared space yet (create one / join with a code)
//   ready     – signed in and in a couple; the data store has been booted
//   error     – couldn't reach Supabase

import type { Session as SupabaseSession, User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { fetchMyCouple, createCouple as rpcCreate, joinCouple as rpcJoin, type CoupleInfo } from "./remote";
import { bootRemote, teardownRemote } from "./store";
import { getSupabase, isSupabaseConfigured as shared } from "./supabase/client";

export type SessionStatus = "local" | "loading" | "signedOut" | "noCouple" | "ready" | "error";

export interface Session {
  status: SessionStatus;
  userId: string | null;
  email: string | null;
  couple: CoupleInfo | null;
  error: string | null;
}

const LOADING: Session = { status: "loading", userId: null, email: null, couple: null, error: null };
const LOCAL: Session = { status: "local", userId: null, email: null, couple: null, error: null };

let state: Session | null = null;
let started = false;
let loadToken = 0;
const listeners = new Set<() => void>();

function set(next: Session) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (shared && !started) start();
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => (state ??= shared ? LOADING : LOCAL);

export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING);
}

function start() {
  started = true;
  getSupabase().auth.onAuthStateChange((event, session) => {
    // supabase-js can deadlock if you call it from inside this callback, so hop out first
    setTimeout(() => void onAuth(event, session), 0);
  });
}

async function onAuth(event: string, session: SupabaseSession | null) {
  if (event === "TOKEN_REFRESHED") return;
  const user = session?.user ?? null;
  if (!user) {
    loadToken++;
    teardownRemote();
    return set({ status: "signedOut", userId: null, email: null, couple: null, error: null });
  }
  // supabase-js re-emits SIGNED_IN when a tab regains focus — don't reload everything for the same person
  const cur = getSnapshot();
  if (cur.userId === user.id && (cur.status === "ready" || cur.status === "noCouple")) {
    if (cur.email !== user.email) set({ ...cur, email: user.email ?? null });
    return;
  }
  await loadCouple(user);
}

async function loadCouple(user: Pick<User, "id" | "email">) {
  const token = ++loadToken;
  const base = { userId: user.id, email: user.email ?? null };
  try {
    const couple = await fetchMyCouple(getSupabase(), user.id);
    if (token !== loadToken) return;
    if (!couple) {
      teardownRemote();
      return set({ ...base, status: "noCouple", couple: null, error: null });
    }
    set({ ...base, status: "ready", couple, error: null });
    void bootRemote(user.id, couple.id);
  } catch (e) {
    if (token !== loadToken) return;
    set({ ...base, status: "error", couple: null, error: (e as Error).message });
  }
}

/** Re-check membership (after creating/joining, or the "try again" button). */
export async function refreshSession() {
  if (!shared) return;
  const { data } = await getSupabase().auth.getUser();
  if (data.user) await loadCouple(data.user);
  else set({ status: "signedOut", userId: null, email: null, couple: null, error: null });
}

// ---- actions (each returns an error message, or null on success) -----------

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  return error ? friendly(error.message) : null;
}

export async function signUp(name: string, email: string, password: string): Promise<{ error: string | null; needsConfirm: boolean }> {
  const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
  if (error) return { error: friendly(error.message), needsConfirm: false };
  return { error: null, needsConfirm: !data.session };
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

/** Create the shared space. Returns the invite code for your person; call refreshSession() when they've seen it. */
export async function createSpace(name: string): Promise<{ code: string | null; error: string | null }> {
  try {
    return { code: await rpcCreate(getSupabase(), name.trim() || "our saturdays"), error: null };
  } catch (e) {
    return { code: null, error: friendly((e as Error).message) };
  }
}

export async function joinSpace(code: string): Promise<string | null> {
  try {
    await rpcJoin(getSupabase(), code);
    await refreshSession();
    return null;
  } catch (e) {
    return friendly((e as Error).message);
  }
}

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "that email and password don't match.";
  if (m.includes("already registered") || m.includes("already been registered")) return "that email already has an account — try signing in.";
  if (m.includes("password should be")) return "pick a longer password (at least 8 characters).";
  if (m.includes("invalid invite")) return "that code doesn't match anyone. check it and try again.";
  if (m.includes("couple is full")) return "that space already has two people in it.";
  if (m.includes("already in a couple")) return "you're already part of a space.";
  if (m.includes("rate limit")) return "too many tries — wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network")) return "couldn't reach the server. check your connection.";
  return msg;
}
