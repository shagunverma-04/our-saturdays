// "What's been happening between us?" — derived from real events, never stored, never a notification.
// Only meaningful moments make it in: finds, reactions worth noting, mutual interest, things done.

import { itemEmoji } from "./categories.ts";
import { signalsFor } from "./shared.ts";
import type { Interaction, Profile, SavedItem } from "./types.ts";

export interface FeedEvent {
  id: string;
  at: string;
  icon: string;
  text: string;
  href: string;
}

const DAY = 86_400_000;

function found(item: SavedItem): string {
  switch (item.category) {
    case "eat": return item.tags.some((t) => t === "coffee" || t === "cafe") ? "a new café" : "a new spot to eat";
    case "watch": return "a movie";
    case "do": return "an activity";
    case "shop": return "something they want";
    case "travel": return "a trip idea";
    case "ideas": return "an idea";
    default: return "a new place";
  }
}

export function activityFeed(items: SavedItem[], interactions: Interaction[], profiles: Profile[], meId: string, now = new Date(), limit = 40): FeedEvent[] {
  const name = (id: string) => (id === meId ? "you" : profiles.find((p) => p.id === id)?.name || "they");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const byId = new Map(items.map((i) => [i.id, i]));
  const cutoff = now.getTime() - 30 * DAY;
  const ev: FeedEvent[] = [];
  const push = (e: FeedEvent) => new Date(e.at).getTime() >= cutoff && ev.push(e);

  for (const item of items) {
    const href = `/later/${item.id}`;
    const who = name(item.created_by);
    push({ id: `saved-${item.id}`, at: item.created_at, icon: itemEmoji(item), text: `${cap(who)} ${item.category === "watch" ? "added" : "saved"} ${found(item)}`, href });
    if (item.status === "done") push({ id: `done-${item.id}`, at: item.updated_at, icon: "🎉", text: `You did “${item.title}”`, href });

    const sig = signalsFor(item, interactions, meId);
    if (sig.mutualAt && sig.mutual) {
      const liked = sig.mine.has("like") || sig.theirs.has("like");
      push({ id: `mutual-${item.id}`, at: sig.mutualAt, icon: "👀", text: liked ? `You both liked “${item.title}”` : `You're both curious about “${item.title}”`, href });
    }
  }

  for (const i of interactions) {
    const item = byId.get(i.saved_item_id);
    if (!item) continue;
    const href = `/later/${item.id}`;
    const sig = signalsFor(item, interactions, meId);
    const isMutualMoment = sig.mutualAt === i.created_at && item.created_by !== i.user_id && i.type !== "saturday";
    if (isMutualMoment) continue; // already told as "you both liked…"
    const whose = item.created_by === i.user_id ? "their own" : item.created_by === meId ? "your" : `${name(item.created_by)}'s`;
    if (i.type === "like" && item.created_by !== i.user_id) push({ id: `like-${i.id}`, at: i.created_at, icon: "❤️", text: `${cap(name(i.user_id))} liked ${whose} “${item.title}” find`, href });
    if (i.type === "saturday") push({ id: `sat-${i.id}`, at: i.created_at, icon: "📅", text: `${cap(name(i.user_id))} suggested Saturday for “${item.title}”`, href });
  }

  return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
