"use client";

// One small external store, two backends behind the same hooks/actions:
//  • demo mode   (no Supabase env): seed data persisted to localStorage on this device
//  • shared mode (Supabase env):    the couple's private space in Supabase — optimistic UI, write-through,
//                                    realtime + refocus refresh. Nothing private is cached in localStorage.
// Components only import from here, so screens don't care which mode they're in.

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { deletePhoto, isStoredRef } from "./media";
import * as remoteIO from "./remote";
import { buildSeed, DEFAULT_PROFILES } from "./seed";
import { getSupabase, isSupabaseConfigured as shared } from "./supabase/client";
import type { NewItemInput, Plan, Profile, SavedItem, Status } from "./types";
import { nextSaturday, toISODate } from "./utils";

const KEY = "our-saturdays:v1";

export interface StoreState {
  ready: boolean;
  error: string | null;
  items: SavedItem[];
  plans: Plan[];
  profiles: Profile[];
  meId: string;
}

const LOADING: StoreState = { ready: false, error: null, items: [], plans: [], profiles: shared ? [] : DEFAULT_PROFILES, meId: "u1" };

let state: StoreState | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// ---- demo (local) persistence ----------------------------------------------

function seeded(error: string | null = null): StoreState {
  const { items, plans } = buildSeed();
  return { ready: true, error, items, plans, profiles: DEFAULT_PROFILES, meId: "u1" };
}

function loadLocal(): StoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seeded();
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.plans)) throw new Error("bad shape");
    const profiles = parsed.profiles?.length === 2 ? parsed.profiles.map((p, i) => ({ ...DEFAULT_PROFILES[i], ...p })) : DEFAULT_PROFILES;
    return { ready: true, error: null, items: parsed.items, plans: parsed.plans, profiles, meId: parsed.meId ?? "u1" };
  } catch {
    // corrupted or blocked storage: fall back to demo data instead of a blank app
    return seeded("we couldn't read your saved stuff, so here's the demo set");
  }
}

function commit(next: StoreState) {
  state = next;
  if (!shared) {
    try {
      const { items, plans, profiles, meId } = next;
      localStorage.setItem(KEY, JSON.stringify({ items, plans, profiles, meId }));
    } catch {
      // storage full/blocked — keep working in memory
    }
  }
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (!shared && e.key === KEY) {
      state = loadLocal();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): StoreState {
  return (state ??= shared ? LOADING : loadLocal());
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING);
}

const FALLBACK_ME: Profile = { id: "", name: "you", avatar: "🙂", photo: "" };

export function useMe(): Profile {
  const s = useStore();
  return s.profiles.find((p) => p.id === s.meId) ?? s.profiles[0] ?? FALLBACK_ME;
}

export function useItem(id: string): { item: SavedItem | undefined; ready: boolean } {
  const s = useStore();
  return { item: s.items.find((i) => i.id === id), ready: s.ready };
}

// ---- shared mode: boot, sync, teardown -------------------------------------

let ctx: { userId: string; coupleId: string } | null = null;
let channel: RealtimeChannel | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let pending = 0; // writes in flight — don't let a refetch clobber optimistic state

const onVisible = () => document.visibilityState === "visible" && scheduleRefresh();

function scheduleRefresh(delay = 250) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, delay);
}

async function refresh() {
  const mine = ctx;
  if (!mine) return;
  if (pending > 0) return scheduleRefresh(400);
  try {
    const data = await remoteIO.fetchSpace(getSupabase());
    if (ctx !== mine || pending > 0) return; // signed out, or a write started meanwhile
    // you first, then your person
    const profiles = [...data.profiles].sort((a, b) => Number(b.id === mine.userId) - Number(a.id === mine.userId));
    commit({ ready: true, error: null, ...data, profiles, meId: mine.userId });
  } catch (e) {
    if (ctx !== mine) return;
    commit({ ...getSnapshot(), ready: true, error: `couldn't reach our space (${(e as Error).message}). we'll keep trying.` });
    scheduleRefresh(8000);
  }
}

/** Called by the session module once we know who you are and which couple you belong to. */
export async function bootRemote(userId: string, coupleId: string) {
  teardownRemote();
  ctx = { userId, coupleId };
  commit({ ...LOADING, meId: userId });
  await refresh();
  if (ctx?.coupleId !== coupleId) return;

  const sb = getSupabase();
  const relevant = (p: { eventType: string; new: Record<string, unknown> }) => p.eventType === "DELETE" || p.new.couple_id === undefined || p.new.couple_id === coupleId;
  channel = sb
    .channel(`space:${coupleId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "saved_items" }, (p) => relevant(p) && scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, (p) => relevant(p) && scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => scheduleRefresh())
    .subscribe();
  // phones suspend websockets in the background; catching up on return is what makes it feel live
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onVisible);
}

export function teardownRemote() {
  clearTimeout(refreshTimer);
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("online", onVisible);
  if (channel) void getSupabase().removeChannel(channel);
  channel = null;
  ctx = null;
  pending = 0;
  if (shared && state) commit(LOADING);
}

/** Run a write against Supabase; on failure surface it and re-sync from the server (rolls back the optimistic change). */
async function send(job: (sb: ReturnType<typeof getSupabase>) => Promise<void>) {
  if (!ctx) return;
  pending++;
  try {
    await job(getSupabase());
  } catch (e) {
    commit({ ...getSnapshot(), error: `that didn't save (${(e as Error).message})` });
  } finally {
    pending--;
    scheduleRefresh(pending ? 400 : 0);
  }
}

/** In shared mode, actions before boot are ignored (the gate keeps the UI away until then). */
const usable = () => !shared || ctx !== null;

// ---- actions ---------------------------------------------------------------

const uid = () => crypto.randomUUID();

export function addItem(input: NewItemInput): SavedItem {
  const s = getSnapshot();
  const now = new Date().toISOString();
  const item: SavedItem = {
    description: "",
    image_url: "",
    source_url: "",
    location_name: "",
    status: "saved",
    release_date: "",
    notes: "",
    tags: [],
    ...input,
    id: uid(),
    created_by: s.meId,
    created_at: now,
    updated_at: now,
  };
  if (!usable()) return item;
  commit({ ...s, items: [item, ...s.items] });
  if (ctx) void send((sb) => remoteIO.insertItem(sb, ctx!.coupleId, item));
  return item;
}

export function updateItem(id: string, patch: Partial<SavedItem>) {
  if (!usable()) return;
  const s = getSnapshot();
  const old = s.items.find((i) => i.id === id);
  commit({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch, updated_at: new Date().toISOString() } : i)) });
  if (ctx) {
    const replacedPhoto = old && patch.image_url !== undefined && old.image_url !== patch.image_url && isStoredRef(old.image_url) ? old.image_url : "";
    void send(async (sb) => {
      await remoteIO.patchItem(sb, id, patch);
      if (replacedPhoto) await deletePhoto(replacedPhoto).catch(() => {});
    });
  }
}

export function removeItem(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  const old = s.items.find((i) => i.id === id);
  commit({ ...s, items: s.items.filter((i) => i.id !== id), plans: s.plans.filter((p) => p.saved_item_id !== id) });
  if (ctx) {
    void send(async (sb) => {
      await remoteIO.deleteItem(sb, id);
      if (old && isStoredRef(old.image_url)) await deletePhoto(old.image_url).catch(() => {});
    });
  }
}

/** "let's do it": puts an item on a date (one plan per date) and marks it planned. */
export function planItem(itemId: string, date: string) {
  if (!usable()) return;
  const s = getSnapshot();
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return;
  const now = new Date().toISOString();
  const plan: Plan = { id: uid(), title: item.title, date, category: item.category, saved_item_id: item.id, created_at: now };
  const replaced = s.plans.filter((p) => p.date === date);
  // whatever we bumped off that date goes back to "saved"
  const bumped = s.items.filter((i) => i.id !== itemId && i.status === "planned" && replaced.some((p) => p.saved_item_id === i.id)).map((i) => i.id);
  commit({
    ...s,
    plans: [...s.plans.filter((p) => p.date !== date), plan],
    items: s.items.map((i) => (i.id === itemId ? { ...i, status: "planned", updated_at: now } : bumped.includes(i.id) ? { ...i, status: "saved", updated_at: now } : i)),
  });
  if (ctx) void send((sb) => remoteIO.writePlan(sb, ctx!.coupleId, plan, bumped));
}

/**
 * The one place statuses change, so plans never go stale:
 * "planned" puts it on a Saturday, anything else takes it off the calendar.
 */
export function setStatus(itemId: string, status: Status, date = toISODate(nextSaturday())) {
  if (status === "planned") return planItem(itemId, date);
  if (!usable()) return;
  const s = getSnapshot();
  const now = new Date().toISOString();
  commit({
    ...s,
    plans: s.plans.filter((p) => p.saved_item_id !== itemId),
    items: s.items.map((i) => (i.id === itemId ? { ...i, status, updated_at: now } : i)),
  });
  if (ctx) void send((sb) => remoteIO.setItemStatusOffCalendar(sb, itemId, status));
}

/** Demo mode only: pretend to be the other person. In shared mode you are whoever signed in. */
export function setMe(id: string) {
  if (!shared) commit({ ...getSnapshot(), meId: id });
}

export function updateProfile(id: string, patch: Partial<Profile>) {
  if (!usable()) return;
  const s = getSnapshot();
  const old = s.profiles.find((p) => p.id === id);
  commit({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  if (ctx) {
    const replacedPhoto = old && patch.photo !== undefined && old.photo !== patch.photo && isStoredRef(old.photo) ? old.photo : "";
    void send(async (sb) => {
      await remoteIO.patchProfile(sb, id, patch);
      if (replacedPhoto) await deletePhoto(replacedPhoto).catch(() => {});
    });
  }
}

export function resetDemo() {
  if (!shared) commit(seeded());
}
