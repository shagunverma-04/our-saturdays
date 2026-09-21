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
import { isCorrectGuess } from "./games";
import type { Drawing, Game, GameAttempt, GameType, Interaction, InteractionType, Memory, NewItemInput, NewMemoryInput, NewTripInput, Plan, Profile, SavedItem, Status, Trip, TripExpense, TripItem } from "./types";
import { nextSaturday, toISODate } from "./utils";

const KEY = "our-saturdays:v1";

export interface StoreState {
  ready: boolean;
  error: string | null;
  items: SavedItem[];
  plans: Plan[];
  profiles: Profile[];
  meId: string;
  interactions: Interaction[];
  memories: Memory[];
  drawings: Drawing[];
  trips: Trip[];
  games: Game[];
  /** false when the database doesn't have item_interactions yet (migration 003 not run) */
  interactionsReady: boolean;
  /** a small, non-blocking message (e.g. "couldn't save that — retry") */
  notice: { id: number; message: string; retry?: () => void } | null;
}

const LOADING: StoreState = { ready: false, error: null, items: [], plans: [], profiles: shared ? [] : DEFAULT_PROFILES, meId: "u1", interactions: [], memories: [], drawings: [], trips: [], games: [], interactionsReady: true, notice: null };

let state: StoreState | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// ---- demo (local) persistence ----------------------------------------------

function seeded(error: string | null = null): StoreState {
  const { items, plans, interactions, memories, trips, games } = buildSeed();
  return { ready: true, error, items, plans, profiles: DEFAULT_PROFILES, meId: "u1", interactions, memories, drawings: [], trips, games, interactionsReady: true, notice: null };
}

function loadLocal(): StoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seeded();
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.plans)) throw new Error("bad shape");
    const profiles = parsed.profiles?.length === 2 ? parsed.profiles.map((p, i) => ({ ...DEFAULT_PROFILES[i], ...p })) : DEFAULT_PROFILES;
    return { ready: true, error: null, items: parsed.items, plans: parsed.plans, profiles, meId: parsed.meId ?? "u1", interactions: parsed.interactions ?? buildSeed().interactions, memories: parsed.memories ?? buildSeed().memories, drawings: parsed.drawings ?? [], trips: parsed.trips ?? buildSeed().trips, games: parsed.games ?? buildSeed().games, interactionsReady: true, notice: null };
  } catch {
    // corrupted or blocked storage: fall back to demo data instead of a blank app
    return seeded("we couldn't read your saved stuff, so here's the demo set");
  }
}

function commit(next: StoreState) {
  state = next;
  if (!shared) {
    try {
      const { items, plans, profiles, meId, interactions, memories, drawings, trips, games } = next;
      localStorage.setItem(KEY, JSON.stringify({ items, plans, profiles, meId, interactions, memories, drawings, trips, games }));
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

/** " (reason)" when the error has one worth showing; empty otherwise (no dangling parentheses). */
const detail = (e: unknown) => {
  const m = e instanceof Error ? e.message.trim() : "";
  return m ? ` (${m})` : "";
};

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
    commit({ ...getSnapshot(), ready: true, error: null, ...data, profiles, meId: mine.userId });
  } catch (e) {
    if (ctx !== mine) return;
    commit({ ...getSnapshot(), ready: true, error: `couldn't reach our space${detail(e)} — we'll keep trying.` });
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
    .on("postgres_changes", { event: "*", schema: "public", table: "item_interactions" }, (p) => relevant(p) && scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "memories" }, (p) => relevant(p) && scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "memory_photos" }, () => scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "drawings" }, (p) => relevant(p) && scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, (p) => relevant(p) && scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "trip_items" }, () => scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "trip_expenses" }, () => scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "games" }, (p) => relevant(p) && scheduleRefresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "game_attempts" }, () => scheduleRefresh())
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
/** Every write goes through one queue, so they reach the database in the order you made them (add an item, then react to it). */
let writeQueue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
  const run = writeQueue.then(fn);
  writeQueue = run.catch(() => {});
  return run;
};

async function send(job: (sb: ReturnType<typeof getSupabase>) => Promise<void>) {
  if (!ctx) return;
  pending++;
  try {
    await enqueue(() => job(getSupabase()));
  } catch (e) {
    commit({ ...getSnapshot(), error: `that didn't save${detail(e)}` });
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
  commit({ ...s, items: s.items.filter((i) => i.id !== id), plans: s.plans.filter((p) => p.saved_item_id !== id), interactions: s.interactions.filter((i) => i.saved_item_id !== id) });
  if (ctx) {
    void send(async (sb) => {
      await remoteIO.deleteItem(sb, id);
      if (old && isStoredRef(old.image_url)) await deletePhoto(old.image_url).catch(() => {});
    });
  }
}

/** "let's do it": puts an item on a date (one plan per date) and marks it planned. */
export function planItem(itemId: string, date: string, time: string | null = null) {
  if (!usable()) return;
  const s = getSnapshot();
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return;
  const now = new Date().toISOString();
  const plan: Plan = { id: uid(), title: item.title, date, category: item.category, saved_item_id: item.id, time, created_at: now };
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

/** Read-only lookups for code that runs outside React (e.g. link capture). */
export function getItemNow(id: string): SavedItem | undefined {
  return getSnapshot().items.find((i) => i.id === id);
}

const normUrl = (u: string) => u.trim().replace(/#.*$/, "").replace(/[?&](utm_[a-z]+|igsh|igshid|si|fbclid)=[^&]*/gi, "").replace(/[?&]$/, "").replace(/\/+$/, "").toLowerCase();
/** Same link saved twice (ignoring tracking junk) → the existing item, so re-sharing never duplicates. */
export function findItemByUrl(url: string): SavedItem | undefined {
  const n = normUrl(url);
  return getSnapshot().items.find((i) => i.source_url && normUrl(i.source_url) === n);
}

/** Give (or clear) the optional time of a plan: "saturday · 6 PM". */
export function setPlanTime(planId: string, time: string | null) {
  if (!usable()) return;
  const s = getSnapshot();
  commit({ ...s, plans: s.plans.map((p) => (p.id === planId ? { ...p, time } : p)) });
  if (ctx) void send((sb) => remoteIO.setPlanTime(sb, planId, time));
}

// ---- drawings ----------------------------------------------------------------

export function addDrawing(input: { image: string; caption?: string }): Drawing {
  const s = getSnapshot();
  const d: Drawing = { id: uid(), created_by: s.meId, image: input.image, caption: input.caption ?? "", seen_by: [s.meId], created_at: new Date().toISOString() };
  if (!usable()) return d;
  commit({ ...s, drawings: [d, ...s.drawings] });
  if (ctx) void send((sb) => remoteIO.insertDrawing(sb, ctx!.coupleId, d));
  return d;
}

/** Opening your partner's drawing marks it seen, which quiets the "new drawing" nudge on Home. */
export function markDrawingSeen(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  const d = s.drawings.find((x) => x.id === id);
  if (!d || d.seen_by.includes(s.meId)) return;
  const seen = [...d.seen_by, s.meId];
  commit({ ...s, drawings: s.drawings.map((x) => (x.id === id ? { ...x, seen_by: seen } : x)) });
  if (ctx) void send((sb) => remoteIO.markDrawingSeen(sb, id, seen));
}

export function removeDrawing(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  const old = s.drawings.find((d) => d.id === id);
  commit({ ...s, drawings: s.drawings.filter((d) => d.id !== id) });
  if (ctx) {
    void send(async (sb) => {
      await remoteIO.deleteDrawing(sb, id);
      if (old && isStoredRef(old.image)) await deletePhoto(old.image).catch(() => {});
    });
  }
}

// ---- trips -------------------------------------------------------------------

export function addTrip(input: NewTripInput): Trip {
  const s = getSnapshot();
  const trip: Trip = { destination: "", start_date: "", end_date: "", notes: "", budget_estimate: null, ...input, id: uid(), created_at: new Date().toISOString(), items: [], expenses: [] };
  if (!usable()) return trip;
  commit({ ...s, trips: [...s.trips, trip] });
  if (ctx) void send((sb) => remoteIO.insertTrip(sb, ctx!.coupleId, trip));
  return trip;
}

export function updateTrip(id: string, patch: Partial<Omit<Trip, "id" | "created_at" | "items" | "expenses">>) {
  if (!usable()) return;
  const s = getSnapshot();
  commit({ ...s, trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  if (ctx) void send((sb) => remoteIO.patchTrip(sb, id, patch));
}

export function removeTrip(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  // memories from the trip stay; they just stop being tagged
  commit({ ...s, trips: s.trips.filter((t) => t.id !== id), memories: s.memories.map((m) => (m.trip_id === id ? { ...m, trip_id: null } : m)) });
  if (ctx) void send((sb) => remoteIO.deleteTrip(sb, id));
}

export function addTripItem(tripId: string, input: Partial<TripItem> & { title: string }): TripItem {
  const item: TripItem = { saved_item_id: null, item_type: "other", location: "", scheduled_date: "", scheduled_time: "", notes: "", ...input, id: uid(), trip_id: tripId };
  if (!usable()) return item;
  const s = getSnapshot();
  commit({ ...s, trips: s.trips.map((t) => (t.id === tripId ? { ...t, items: [...t.items, item] } : t)) });
  if (ctx) void send((sb) => remoteIO.insertTripItem(sb, item));
  return item;
}

export function updateTripItem(id: string, patch: Partial<Omit<TripItem, "id" | "trip_id">>) {
  if (!usable()) return;
  const s = getSnapshot();
  commit({ ...s, trips: s.trips.map((t) => ({ ...t, items: t.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })) });
  if (ctx) void send((sb) => remoteIO.patchTripItem(sb, id, patch));
}

export function removeTripItem(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  commit({ ...s, trips: s.trips.map((t) => ({ ...t, items: t.items.filter((i) => i.id !== id) })) });
  if (ctx) void send((sb) => remoteIO.deleteTripItem(sb, id));
}

export function addExpense(tripId: string, input: { category: TripExpense["category"]; amount: number; description?: string }): TripExpense {
  const s = getSnapshot();
  const e: TripExpense = { id: uid(), trip_id: tripId, category: input.category, amount: input.amount, description: input.description ?? "", paid_by: s.meId, created_at: new Date().toISOString() };
  if (!usable()) return e;
  commit({ ...s, trips: s.trips.map((t) => (t.id === tripId ? { ...t, expenses: [...t.expenses, e] } : t)) });
  if (ctx) void send((sb) => remoteIO.insertExpense(sb, e));
  return e;
}

export function removeExpense(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  commit({ ...s, trips: s.trips.map((t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== id) })) });
  if (ctx) void send((sb) => remoteIO.deleteExpense(sb, id));
}

// ---- games -------------------------------------------------------------------

export function createGuessGame(input: { prompt: string; answer: string; hint: string }): Game {
  const s = getSnapshot();
  const g: Game = { id: uid(), type: "guess_word", created_by: s.meId, prompt: input.prompt, answer: input.answer, hint: input.hint, created_at: new Date().toISOString(), attempts: [] };
  if (!usable()) return g;
  commit({ ...s, games: [g, ...s.games] });
  if (ctx) void send((sb) => remoteIO.insertGame(sb, ctx!.coupleId, g));
  return g;
}

function pushAttempt(gameId: string, guess: string, correct: boolean): GameAttempt | null {
  const s = getSnapshot();
  if (!s.games.some((g) => g.id === gameId)) return null;
  const a: GameAttempt = { id: uid(), game_id: gameId, user_id: s.meId, guess, correct, created_at: new Date().toISOString() };
  commit({ ...s, games: s.games.map((g) => (g.id === gameId ? { ...g, attempts: [...g.attempts, a] } : g)) });
  if (ctx) void send((sb) => remoteIO.insertAttempt(sb, a));
  return a;
}

/** Guess your partner's word. Any number of tries. You can't guess your own game, or one that's already solved. */
export function submitGuess(gameId: string, guess: string): GameAttempt | null {
  if (!usable() || !guess.trim()) return null;
  const s = getSnapshot();
  const g = s.games.find((x) => x.id === gameId);
  if (!g || g.type !== "guess_word" || g.created_by === s.meId || g.attempts.some((a) => a.correct)) return null;
  return pushAttempt(gameId, guess.trim(), isCorrectGuess(guess, g.answer));
}

/**
 * Record a round of "who saved this?" / "remember when?". One shared game row per find / memory (created on first play),
 * with each person's answer stored as an attempt, which is what makes the history.
 */
export function recordPlay(type: Extract<GameType, "who_saved" | "remember_when">, subjectId: string, answer: string, guess: string, correct: boolean): GameAttempt | null {
  if (!usable()) return null;
  const s = getSnapshot();
  let game = s.games.find((g) => g.type === type && g.prompt === subjectId);
  if (game?.attempts.some((a) => a.user_id === s.meId)) return null; // each of you plays each one once
  if (!game) {
    game = { id: uid(), type, created_by: s.meId, prompt: subjectId, answer, hint: "", created_at: new Date().toISOString(), attempts: [] };
    commit({ ...s, games: [game, ...s.games] });
    if (ctx) void send((sb) => remoteIO.insertGame(sb, ctx!.coupleId, game!));
  }
  return pushAttempt(game.id, guess, correct);
}

export function removeGame(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  commit({ ...s, games: s.games.filter((g) => g.id !== id) });
  if (ctx) void send((sb) => remoteIO.deleteGame(sb, id));
}

// ---- memories ----------------------------------------------------------------

export function getMemoryNow(id: string): Memory | undefined {
  return getSnapshot().memories.find((m) => m.id === id);
}

export function addMemory(input: NewMemoryInput): Memory {
  const s = getSnapshot();
  const memory: Memory = {
    description: "",
    date: toISODate(new Date()),
    location: "",
    saved_item_id: null,
    photos: [],
    ...input,
    id: uid(),
    created_by: s.meId,
    created_at: new Date().toISOString(),
  };
  if (!usable()) return memory;
  commit({ ...s, memories: [memory, ...s.memories] });
  if (ctx) void send((sb) => remoteIO.insertMemory(sb, ctx!.coupleId, memory));
  return memory;
}

export function updateMemory(id: string, patch: Partial<Memory>) {
  if (!usable()) return;
  const s = getSnapshot();
  const old = s.memories.find((m) => m.id === id);
  if (!old) return;
  commit({ ...s, memories: s.memories.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  if (ctx) {
    const dropped = patch.photos ? old.photos.filter((p) => !patch.photos!.includes(p) && isStoredRef(p)) : [];
    void send(async (sb) => {
      await remoteIO.patchMemory(sb, id, patch, old.photos);
      for (const p of dropped) await deletePhoto(p).catch(() => {});
    });
  }
}

export function removeMemory(id: string) {
  if (!usable()) return;
  const s = getSnapshot();
  const old = s.memories.find((m) => m.id === id);
  commit({ ...s, memories: s.memories.filter((m) => m.id !== id) });
  if (ctx) {
    void send(async (sb) => {
      await remoteIO.deleteMemory(sb, id);
      for (const p of old?.photos ?? []) if (isStoredRef(p)) await deletePhoto(p).catch(() => {});
    });
  }
}

// ---- reactions ---------------------------------------------------------------

let noticeSeq = 0;
/** Show a small, non-blocking message. Pass `retry` to offer a "try again". */
export function showNotice(message: string, retry?: () => void) {
  commit({ ...getSnapshot(), notice: { id: ++noticeSeq, message, retry } });
}
export function dismissNotice() {
  const s = getSnapshot();
  if (s.notice) commit({ ...s, notice: null });
}

const POSITIVE_TYPES: InteractionType[] = ["like", "interested", "saturday"];

/**
 * Tap a reaction on/off. The UI updates instantly; the write follows. If it fails, this one reaction is put
 * back exactly as it was and a small "try again" appears — nothing else on screen is disturbed.
 */
export function toggleInteraction(itemId: string, type: InteractionType) {
  if (!usable()) return;
  const s = getSnapshot();
  if (shared && !s.interactionsReady) return showNotice("reactions need the latest database update (run 003_interactions.sql)");
  const mine = (i: Interaction) => i.saved_item_id === itemId && i.user_id === s.meId;
  const before = s.interactions.filter(mine);
  const existing = before.find((i) => i.type === type);
  const created: Interaction | null = existing ? null : { id: uid(), saved_item_id: itemId, user_id: s.meId, type, created_at: new Date().toISOString() };
  // "not for us" and any positive reaction cancel each other (for the same person)
  const removed = existing ? [existing] : before.filter((i) => (type === "dismissed" ? POSITIVE_TYPES.includes(i.type) : POSITIVE_TYPES.includes(type) && i.type === "dismissed"));
  const rest = s.interactions.filter((i) => !removed.includes(i));
  commit({ ...s, interactions: created ? [...rest, created] : rest });
  if (!ctx) return;
  const coupleId = ctx.coupleId;
  pending++;
  void (async () => {
    try {
      await enqueue(async () => {
        const sb = getSupabase();
        for (const r of removed) await remoteIO.deleteInteraction(sb, itemId, s.meId, r.type);
        if (created) await remoteIO.insertInteraction(sb, coupleId, created);
      });
    } catch (e) {
      // revert just this item's reactions for me, then offer a retry
      const now = getSnapshot();
      commit({ ...now, interactions: [...now.interactions.filter((i) => !mine(i)), ...before] });
      console.warn("reaction failed", e);
      showNotice("couldn't save that — check your connection", () => toggleInteraction(itemId, type));
    } finally {
      pending--;
      scheduleRefresh(pending ? 400 : 0);
    }
  })();
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
