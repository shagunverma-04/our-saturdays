// The "shared interest" model. Pure functions only (no React, no I/O) so it can be unit-tested.
//
// One saved item has one creator. Reactions live separately. Everything the UI says about an item
// ("you both like this", "Saturday?") is DERIVED from those reactions — nobody maintains a status.

import type { Interaction, InteractionType, SavedItem } from "./types.ts";

const POSITIVE: InteractionType[] = ["like", "interested", "saturday"];

export interface Signals {
  mine: Set<InteractionType>;
  theirs: Set<InteractionType>;
  /** both of you are into it (the creator counts as interested just by saving it) */
  mutual: boolean;
  /** one of you said "not for us" */
  dismissed: boolean;
  saturdayMine: boolean;
  saturdayTheirs: boolean;
  /** the moment the second person first came on board */
  mutualAt: string | null;
}

export function signalsFor(item: SavedItem, interactions: Interaction[], meId: string): Signals {
  const mine = new Set<InteractionType>();
  const theirs = new Set<InteractionType>();
  const positiveAt = { mine: "", theirs: "" };
  for (const i of interactions) {
    if (i.saved_item_id !== item.id) continue;
    const side = i.user_id === meId ? "mine" : "theirs";
    (side === "mine" ? mine : theirs).add(i.type);
    if (POSITIVE.includes(i.type) && (!positiveAt[side] || i.created_at < positiveAt[side])) positiveAt[side] = i.created_at; // earliest: that's when they came on board
  }
  const iCreated = item.created_by === meId;
  const minePositive = iCreated || POSITIVE.some((t) => mine.has(t));
  const theirsPositive = !iCreated || POSITIVE.some((t) => theirs.has(t));
  const dismissed = mine.has("dismissed") || theirs.has("dismissed");
  const mutual = minePositive && theirsPositive && !dismissed;
  // the moment it became mutual = when the non-creator first reacted
  const mutualAt = mutual ? (iCreated ? positiveAt.theirs : positiveAt.mine) || null : null;
  return { mine, theirs, mutual, dismissed, saturdayMine: mine.has("saturday"), saturdayTheirs: theirs.has("saturday"), mutualAt };
}

export interface Names {
  meId: string;
  /** partner's display name ("" if they haven't joined) */
  partner: string;
}

const isOpen = (i: SavedItem) => i.status !== "done" && i.status !== "archived";

/** The one conversational line shown on a card. Names, not pronouns — we don't assume anyone's. */
export function conversation(item: SavedItem, sig: Signals, n: Names): string {
  const p = n.partner || "they";
  const iCreated = item.created_by === n.meId;
  if (item.status === "done") return "you did this 🎉";
  if (sig.dismissed) return sig.mine.has("dismissed") ? "you passed on this one" : `${p} passed on this one`;
  if (sig.saturdayMine && sig.saturdayTheirs) return "Saturday plan? ✨";
  if (sig.saturdayTheirs) return `${p} wants to do this Saturday 👀`;
  if (sig.saturdayMine) return n.partner ? `you asked about Saturday — waiting on ${p} 👀` : "you'd like to do this Saturday 👀";
  if (sig.mutual) {
    const liked = sig.mine.has("like") || sig.theirs.has("like");
    return liked ? "you both like this ❤️" : "you're both curious 👀";
  }
  if (!iCreated && n.partner) return `${p} found this — what do you think?`;
  if (iCreated && n.partner) return `waiting for ${p}'s take 👀`;
  return "";
}

export type FindsView = "our" | "mine" | "theirs";

/** Which of the three views an item belongs to. "our list" is earned by mutual interest, never by dragging. */
export function inView(item: SavedItem, sig: Signals, view: FindsView, meId: string): boolean {
  if (item.status === "archived") return false;
  if (view === "our") return sig.mutual && item.status !== "done";
  if (view === "mine") return item.created_by === meId && item.status !== "done";
  return item.created_by !== meId && item.status !== "done";
}

export interface Candidate {
  item: SavedItem;
  sig: Signals;
  score: number;
  why: string;
}

/**
 * Saturday candidates, best first. Prefers what you both want (both tapped 📅 > one did > mutual > fresh finds),
 * skips anything done, archived, dismissed, or already on the calendar.
 */
export function saturdayCandidates(items: SavedItem[], interactions: Interaction[], meId: string, plannedIds: Set<string>, now = new Date()): Candidate[] {
  const out: Candidate[] = [];
  for (const item of items) {
    if (!isOpen(item) || plannedIds.has(item.id)) continue;
    const sig = signalsFor(item, interactions, meId);
    if (sig.dismissed) continue;
    const ageDays = (now.getTime() - new Date(item.created_at).getTime()) / 86_400_000;
    let score = 0, why = "";
    if (sig.saturdayMine && sig.saturdayTheirs) [score, why] = [100, "you both said Saturday"];
    else if (sig.saturdayMine || sig.saturdayTheirs) [score, why] = [70, "someone said Saturday"];
    else if (sig.mutual) [score, why] = [45, "you both like it"];
    else if (ageDays <= 10) [score, why] = [8, "fresh find"];
    if (score) out.push({ item, sig, score: score - Math.min(ageDays, 30) * 0.1, why });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Things worth rolling the dice on: only shared-interest items, unless there aren't any yet. */
export function pickPool(items: SavedItem[], interactions: Interaction[], meId: string, plannedIds: Set<string>): { pool: SavedItem[]; shared: boolean } {
  const open = items.filter((i) => isOpen(i) && !plannedIds.has(i.id));
  const withSig = open.map((item) => ({ item, sig: signalsFor(item, interactions, meId) })).filter((x) => !x.sig.dismissed);
  const shared = withSig.filter((x) => x.sig.mutual || x.sig.saturdayMine || x.sig.saturdayTheirs);
  return shared.length ? { pool: shared.map((x) => x.item), shared: true } : { pool: withSig.map((x) => x.item), shared: false };
}

/** Weighted random pick that avoids what was just shown. `rand` is injectable for tests. */
export function weightedPick(pool: SavedItem[], interactions: Interaction[], meId: string, avoid: string[], rand = Math.random, now = new Date()): SavedItem | null {
  const candidates = pool.filter((i) => !avoid.includes(i.id));
  const list = candidates.length ? candidates : pool.filter((i) => i.id !== avoid[avoid.length - 1]);
  if (!list.length) return pool[0] ?? null;
  const weights = list.map((item) => {
    const sig = signalsFor(item, interactions, meId);
    const ageDays = (now.getTime() - new Date(item.created_at).getTime()) / 86_400_000;
    return 1 + (sig.mutual ? 2 : 0) + (sig.saturdayMine || sig.saturdayTheirs ? 2 : 0) + (ageDays <= 14 ? 1 : 0);
  });
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
