// All Supabase I/O for the shared space, as plain functions of a client. No React, no browser globals —
// so the store stays simple and these exact queries are integration-tested (supabase/tests/remote.test.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interaction, InteractionType, Plan, Profile, SavedItem } from "./types";

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
    created_at: r.created_at as string,
  };
}

export function rowToProfile(r: Row): Profile {
  return { id: r.id as string, name: (r.name as string) ?? "", avatar: (r.avatar_emoji as string) ?? "🙂", photo: (r.avatar_url as string | null) ?? "" };
}

export function rowToInteraction(r: Row): Interaction {
  return { id: r.id as string, saved_item_id: r.saved_item_id as string, user_id: r.user_id as string, type: r.interaction_type as InteractionType, created_at: r.created_at as string };
}

export function profilePatchToRow(p: Partial<Profile>): Row {
  const row: Row = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.avatar !== undefined) row.avatar_emoji = p.avatar;
  if (p.photo !== undefined) row.avatar_url = p.photo || null;
  return row;
}

// ---- reads -----------------------------------------------------------------

export async function fetchSpace(sb: SupabaseClient): Promise<{ items: SavedItem[]; plans: Plan[]; profiles: Profile[]; interactions: Interaction[]; interactionsReady: boolean }> {
  // RLS scopes every one of these to the caller's couple, so no couple_id filter is needed (or trusted).
  const [items, plans, profiles, inter] = await Promise.all([
    ok(sb.from("saved_items").select("*").order("created_at", { ascending: false }).limit(1000)),
    ok(sb.from("plans").select("*")),
    ok(sb.from("profiles").select("id, name, avatar_emoji, avatar_url")),
    // tolerated separately: if migration 003 hasn't been run yet the app still works, just without reactions
    sb.from("item_interactions").select("id, saved_item_id, user_id, interaction_type, created_at").limit(5000),
  ]);
  return {
    items: (items.data as Row[]).map(rowToItem),
    plans: (plans.data as Row[]).map(rowToPlan),
    profiles: (profiles.data as Row[]).map(rowToProfile),
    interactions: inter.error ? [] : ((inter.data ?? []) as Row[]).map(rowToInteraction),
    interactionsReady: !inter.error,
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
  await ok(sb.from("plans").insert({ id: plan.id, couple_id: coupleId, title: plan.title, date: plan.date, category: plan.category, saved_item_id: plan.saved_item_id }));
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

// ---- couples (RPC — members can't insert into couples directly) ------------

export async function createCouple(sb: SupabaseClient, name: string): Promise<string> {
  const { data } = await ok(sb.rpc("create_couple", { couple_name: name }));
  return data as string;
}

export async function joinCouple(sb: SupabaseClient, code: string): Promise<string> {
  const { data } = await ok(sb.rpc("join_couple", { code }));
  return data as string;
}
