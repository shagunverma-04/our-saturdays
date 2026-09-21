// All Supabase I/O for the shared space, as plain functions of a client. No React, no browser globals —
// so the store stays simple and these exact queries are integration-tested (supabase/tests/remote.test.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Drawing, Game, GameAttempt, Interaction, InteractionType, Memory, Plan, Profile, SavedItem, Trip, TripExpense, TripItem } from "./types";

type Row = Record<string, unknown>;
interface Result {
  error: { message: string } | null;
}

/** Throw on a failed call so callers can `await` a sequence and stop at the first error. */
async function ok<T extends Result>(p: PromiseLike<T>): Promise<T> {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}

// ---- row <-> app mapping ---------------------------------------------------

export function rowToItem(r: Row): SavedItem {
  return {
    id: r.id as string,
    created_by: r.created_by as string,
    title: r.title as string,
    category: r.category as SavedItem["category"],
    description: (r.description as string) ?? "",
    image_url: (r.image_url as string) ?? "",
    source_url: (r.source_url as string) ?? "",
    location_name: (r.location_name as string) ?? "",
    status: r.status as SavedItem["status"],
    release_date: (r.release_date as string | null) ?? "",
    notes: (r.notes as string) ?? "",
    tags: (r.tags as string[] | null) ?? [],
    latitude: (r.latitude as number | null) ?? null,
    longitude: (r.longitude as number | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

/** App item/patch → DB columns. Server-owned columns are dropped; "" dates become NULL. */
export function itemToRow(p: Partial<SavedItem>): Row {
  const row: Row = { ...p };
  for (const k of ["id", "created_by", "created_at", "updated_at"]) delete row[k];
  if ("release_date" in row) row.release_date = row.release_date || null;
  return row;
}

export function rowToPlan(r: Row): Plan {
  return {
    id: r.id as string,
    title: r.title as string,
    date: r.date as string,
    category: r.category as Plan["category"],
    saved_item_id: (r.saved_item_id as string | null) ?? null,
    time: r.time ? String(r.time).slice(0, 5) : null,
    created_at: r.created_at as string,
  };
}

export function rowToProfile(r: Row): Profile {
  return { id: r.id as string, name: (r.name as string) ?? "", avatar: (r.avatar_emoji as string) ?? "🙂", photo: (r.avatar_url as string | null) ?? "" };
}

export function rowToInteraction(r: Row): Interaction {
  return { id: r.id as string, saved_item_id: r.saved_item_id as string, user_id: r.user_id as string, type: r.interaction_type as InteractionType, created_at: r.created_at as string };
}

export function rowToMemory(r: Row): Memory {
  const photos = ((r.memory_photos as Array<{ storage_path: string; display_order: number }> | null) ?? []).slice().sort((a, b) => a.display_order - b.display_order).map((p) => p.storage_path);
  return {
    id: r.id as string,
    created_by: r.created_by as string,
    title: (r.title as string) ?? "",
    description: (r.description as string) ?? "",
    date: r.date as string,
    location: (r.location as string) ?? "",
    saved_item_id: (r.saved_item_id as string | null) ?? null,
    trip_id: (r.trip_id as string | null) ?? null,
    photos,
    created_at: r.created_at as string,
  };
}

export function rowToDrawing(r: Row): Drawing {
  return { id: r.id as string, created_by: r.created_by as string, image: r.storage_path as string, caption: (r.caption as string) ?? "", seen_by: (r.seen_by as string[] | null) ?? [], created_at: r.created_at as string };
}

const hhmm = (v: unknown) => (v ? String(v).slice(0, 5) : "");
export function rowToTripItem(r: Row): TripItem {
  return {
    id: r.id as string,
    trip_id: r.trip_id as string,
    saved_item_id: (r.saved_item_id as string | null) ?? null,
    item_type: r.item_type as TripItem["item_type"],
    title: (r.title as string) ?? "",
    location: (r.location as string) ?? "",
    scheduled_date: (r.scheduled_date as string | null) ?? "",
    scheduled_time: hhmm(r.scheduled_time),
    notes: (r.notes as string) ?? "",
  };
}
export function rowToExpense(r: Row): TripExpense {
  return { id: r.id as string, trip_id: r.trip_id as string, category: r.category as TripExpense["category"], amount: Number(r.amount), description: (r.description as string) ?? "", paid_by: (r.paid_by as string | null) ?? null, created_at: r.created_at as string };
}
export function rowToTrip(r: Row): Trip {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "",
    destination: (r.destination as string) ?? "",
    start_date: (r.start_date as string | null) ?? "",
    end_date: (r.end_date as string | null) ?? "",
    notes: (r.notes as string) ?? "",
    budget_estimate: r.budget_estimate == null ? null : Number(r.budget_estimate),
    created_at: r.created_at as string,
    items: ((r.trip_items as Row[] | null) ?? []).map(rowToTripItem),
    expenses: ((r.trip_expenses as Row[] | null) ?? []).map(rowToExpense),
  };
}
export function rowToGame(r: Row): Game {
  return {
    id: r.id as string,
    type: r.type as Game["type"],
    created_by: r.created_by as string,
    prompt: (r.prompt as string) ?? "",
    answer: (r.answer as string) ?? "",
    hint: (r.hint as string) ?? "",
    created_at: r.created_at as string,
    attempts: ((r.game_attempts as Row[] | null) ?? []).map((a) => ({ id: a.id as string, game_id: a.game_id as string, user_id: a.user_id as string, guess: (a.guess as string) ?? "", correct: Boolean(a.correct), created_at: a.created_at as string })),
  };
}

export function profilePatchToRow(p: Partial<Profile>): Row {
  const row: Row = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.avatar !== undefined) row.avatar_emoji = p.avatar;
  if (p.photo !== undefined) row.avatar_url = p.photo || null;
  return row;
}

// ---- reads -----------------------------------------------------------------

export async function fetchSpace(sb: SupabaseClient): Promise<{ items: SavedItem[]; plans: Plan[]; profiles: Profile[]; interactions: Interaction[]; interactionsReady: boolean; memories: Memory[]; drawings: Drawing[]; trips: Trip[]; games: Game[] }> {
  // RLS scopes every one of these to the caller's couple, so no couple_id filter is needed (or trusted).
  const [items, plans, profiles, inter, mems, draws, trips, games] = await Promise.all([
    ok(sb.from("saved_items").select("*").order("created_at", { ascending: false }).limit(1000)),
    ok(sb.from("plans").select("*")),
    ok(sb.from("profiles").select("id, name, avatar_emoji, avatar_url")),
    // tolerated separately: if migration 003 hasn't been run yet the app still works, just without reactions
    sb.from("item_interactions").select("id, saved_item_id, user_id, interaction_type, created_at").limit(5000),
    // tolerated separately, like reactions: the journal is optional until its migration has been run
    sb.from("memories").select("*, memory_photos(storage_path, display_order)").order("date", { ascending: false }).limit(1000),
    // the newer features are each tolerated on their own: a missing migration hides that feature, never the app
    sb.from("drawings").select("*").order("created_at", { ascending: false }).limit(500),
    sb.from("trips").select("*, trip_items(*), trip_expenses(*)").order("start_date", { ascending: true, nullsFirst: false }).limit(200),
    sb.from("games").select("*, game_attempts(*)").order("created_at", { ascending: false }).limit(1000),
  ]);
  return {
    items: (items.data as Row[]).map(rowToItem),
    plans: (plans.data as Row[]).map(rowToPlan),
    profiles: (profiles.data as Row[]).map(rowToProfile),
    interactions: inter.error ? [] : ((inter.data ?? []) as Row[]).map(rowToInteraction),
    interactionsReady: !inter.error,
    memories: mems.error ? [] : ((mems.data ?? []) as Row[]).map(rowToMemory),
    drawings: draws.error ? [] : ((draws.data ?? []) as Row[]).map(rowToDrawing),
    trips: trips.error ? [] : ((trips.data ?? []) as Row[]).map(rowToTrip),
    games: games.error ? [] : ((games.data ?? []) as Row[]).map(rowToGame),
  };
}

export interface CoupleInfo {
  id: string;
  name: string;
  inviteCode: string;
}

export async function fetchMyCouple(sb: SupabaseClient, userId: string): Promise<CoupleInfo | null> {
  const { data } = await ok(sb.from("couple_members").select("couple_id, couples(id, name, invite_code)").eq("user_id", userId).maybeSingle());
  if (!data) return null;
  const c = (Array.isArray(data.couples) ? data.couples[0] : data.couples) as Row | undefined;
  if (!c) return null;
  return { id: c.id as string, name: c.name as string, inviteCode: c.invite_code as string };
}

// ---- writes ----------------------------------------------------------------

export async function insertItem(sb: SupabaseClient, coupleId: string, item: SavedItem) {
  const { id, created_by, ...rest } = item;
  await ok(sb.from("saved_items").insert({ id, couple_id: coupleId, created_by, ...itemToRow(rest) }));
}

export async function patchItem(sb: SupabaseClient, id: string, patch: Partial<SavedItem>) {
  await ok(sb.from("saved_items").update(itemToRow(patch)).eq("id", id));
}

export async function deleteItem(sb: SupabaseClient, id: string) {
  await ok(sb.from("plans").delete().eq("saved_item_id", id));
  await ok(sb.from("saved_items").delete().eq("id", id));
}

/** Put an item on a date (one plan per date). `bumpedIds` are items that lose that date and go back to "saved". */
export async function writePlan(sb: SupabaseClient, coupleId: string, plan: Plan, bumpedIds: string[]) {
  await ok(sb.from("plans").delete().eq("couple_id", coupleId).eq("date", plan.date));
  await ok(sb.from("plans").insert({ id: plan.id, couple_id: coupleId, title: plan.title, date: plan.date, category: plan.category, saved_item_id: plan.saved_item_id, time: plan.time || null }));
  if (plan.saved_item_id) await ok(sb.from("saved_items").update({ status: "planned" }).eq("id", plan.saved_item_id));
  if (bumpedIds.length) await ok(sb.from("saved_items").update({ status: "saved" }).in("id", bumpedIds));
}

export async function setItemStatusOffCalendar(sb: SupabaseClient, itemId: string, status: SavedItem["status"]) {
  await ok(sb.from("plans").delete().eq("saved_item_id", itemId));
  await ok(sb.from("saved_items").update({ status }).eq("id", itemId));
}

export async function patchProfile(sb: SupabaseClient, id: string, patch: Partial<Profile>) {
  await ok(sb.from("profiles").update(profilePatchToRow(patch)).eq("id", id));
}

// ---- reactions -------------------------------------------------------------

export async function insertInteraction(sb: SupabaseClient, coupleId: string, i: Interaction) {
  await ok(sb.from("item_interactions").insert({ id: i.id, couple_id: coupleId, saved_item_id: i.saved_item_id, user_id: i.user_id, interaction_type: i.type }));
}

export async function deleteInteraction(sb: SupabaseClient, itemId: string, userId: string, type: InteractionType) {
  await ok(sb.from("item_interactions").delete().eq("saved_item_id", itemId).eq("user_id", userId).eq("interaction_type", type));
}

// ---- memories ----------------------------------------------------------------

export async function insertMemory(sb: SupabaseClient, coupleId: string, m: Memory) {
  const row: Row = { id: m.id, couple_id: coupleId, created_by: m.created_by, title: m.title, description: m.description, date: m.date, location: m.location };
  if (m.saved_item_id) row.saved_item_id = m.saved_item_id; // only when set, so this still works before the column exists
  if (m.trip_id) row.trip_id = m.trip_id;
  await ok(sb.from("memories").insert(row));
  if (m.photos.length) await ok(sb.from("memory_photos").insert(m.photos.map((storage_path, display_order) => ({ memory_id: m.id, storage_path, display_order }))));
}

/** Update a memory's words and reconcile its photo set (remove / add / reorder) against what the server has. */
export async function patchMemory(sb: SupabaseClient, id: string, patch: Partial<Memory>, before: string[]) {
  const { photos, ...rest } = patch;
  const fields: Row = { ...rest };
  for (const k of ["id", "created_by", "created_at"]) delete fields[k];
  if (Object.keys(fields).length) await ok(sb.from("memories").update(fields).eq("id", id));
  if (!photos) return;
  const removed = before.filter((p) => !photos.includes(p));
  if (removed.length) await ok(sb.from("memory_photos").delete().eq("memory_id", id).in("storage_path", removed));
  const added = photos.map((storage_path, display_order) => ({ memory_id: id, storage_path, display_order })).filter((p) => !before.includes(p.storage_path));
  if (added.length) await ok(sb.from("memory_photos").insert(added));
  for (const [display_order, storage_path] of photos.entries()) {
    if (before.includes(storage_path) && before.indexOf(storage_path) !== display_order) await ok(sb.from("memory_photos").update({ display_order }).eq("memory_id", id).eq("storage_path", storage_path));
  }
}

export async function deleteMemory(sb: SupabaseClient, id: string) {
  await ok(sb.from("memories").delete().eq("id", id)); // photo rows go with it (cascade)
}

export async function setPlanTime(sb: SupabaseClient, planId: string, time: string | null) {
  await ok(sb.from("plans").update({ time: time || null }).eq("id", planId));
}

// ---- drawings ------------------------------------------------------------------

export async function insertDrawing(sb: SupabaseClient, coupleId: string, d: Drawing) {
  await ok(sb.from("drawings").insert({ id: d.id, couple_id: coupleId, created_by: d.created_by, storage_path: d.image, caption: d.caption }));
}
/** Add yourself to seen_by (the database only lets a partner grow that list). */
export async function markDrawingSeen(sb: SupabaseClient, id: string, seenBy: string[]) {
  await ok(sb.from("drawings").update({ seen_by: seenBy }).eq("id", id));
}
export async function deleteDrawing(sb: SupabaseClient, id: string) {
  await ok(sb.from("drawings").delete().eq("id", id));
}

// ---- trips ---------------------------------------------------------------------

const tripFields = (t: Partial<Trip>): Row => {
  const row: Row = {};
  if (t.title !== undefined) row.title = t.title;
  if (t.destination !== undefined) row.destination = t.destination;
  if (t.start_date !== undefined) row.start_date = t.start_date || null;
  if (t.end_date !== undefined) row.end_date = t.end_date || null;
  if (t.notes !== undefined) row.notes = t.notes;
  if (t.budget_estimate !== undefined) row.budget_estimate = t.budget_estimate;
  return row;
};
const tripItemFields = (i: Partial<TripItem>): Row => {
  const row: Row = {};
  if (i.saved_item_id !== undefined) row.saved_item_id = i.saved_item_id;
  if (i.item_type !== undefined) row.item_type = i.item_type;
  if (i.title !== undefined) row.title = i.title;
  if (i.location !== undefined) row.location = i.location;
  if (i.scheduled_date !== undefined) row.scheduled_date = i.scheduled_date || null;
  if (i.scheduled_time !== undefined) row.scheduled_time = i.scheduled_time || null;
  if (i.notes !== undefined) row.notes = i.notes;
  return row;
};

export async function insertTrip(sb: SupabaseClient, coupleId: string, t: Trip) {
  await ok(sb.from("trips").insert({ id: t.id, couple_id: coupleId, ...tripFields(t) }));
}
export async function patchTrip(sb: SupabaseClient, id: string, patch: Partial<Trip>) {
  await ok(sb.from("trips").update(tripFields(patch)).eq("id", id));
}
export async function deleteTrip(sb: SupabaseClient, id: string) {
  await ok(sb.from("trips").delete().eq("id", id)); // items + expenses cascade; memories are just untagged
}
export async function insertTripItem(sb: SupabaseClient, i: TripItem) {
  await ok(sb.from("trip_items").insert({ id: i.id, trip_id: i.trip_id, ...tripItemFields(i) }));
}
export async function patchTripItem(sb: SupabaseClient, id: string, patch: Partial<TripItem>) {
  await ok(sb.from("trip_items").update(tripItemFields(patch)).eq("id", id));
}
export async function deleteTripItem(sb: SupabaseClient, id: string) {
  await ok(sb.from("trip_items").delete().eq("id", id));
}
export async function insertExpense(sb: SupabaseClient, e: TripExpense) {
  await ok(sb.from("trip_expenses").insert({ id: e.id, trip_id: e.trip_id, category: e.category, amount: e.amount, description: e.description, paid_by: e.paid_by }));
}
export async function deleteExpense(sb: SupabaseClient, id: string) {
  await ok(sb.from("trip_expenses").delete().eq("id", id));
}

// ---- games ---------------------------------------------------------------------

export async function insertGame(sb: SupabaseClient, coupleId: string, g: Game) {
  const { error } = await sb.from("games").insert({ id: g.id, couple_id: coupleId, type: g.type, created_by: g.created_by, prompt: g.prompt, answer: g.answer, hint: g.hint });
  // who_saved / remember_when are one shared row per subject: if your partner created it a moment ago, that's fine
  if (error && !(error as { code?: string }).code?.startsWith("23505")) throw new Error(error.message);
}
export async function insertAttempt(sb: SupabaseClient, a: GameAttempt) {
  await ok(sb.from("game_attempts").insert({ id: a.id, game_id: a.game_id, user_id: a.user_id, guess: a.guess, correct: a.correct }));
}
export async function deleteGame(sb: SupabaseClient, id: string) {
  await ok(sb.from("games").delete().eq("id", id));
}

// ---- couples (RPC — members can't insert into couples directly) ------------

export async function createCouple(sb: SupabaseClient, name: string): Promise<string> {
  const { data } = await ok(sb.rpc("create_couple", { couple_name: name }));
  return data as string;
}

export async function joinCouple(sb: SupabaseClient, code: string): Promise<string> {
  const { data } = await ok(sb.rpc("join_couple", { code }));
  return data as string;
}
