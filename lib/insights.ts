// Deterministic observations computed from real rows. No AI, no invented numbers:
// every rule has a minimum amount of data, and stays silent below it.

import type { SavedItem } from "./types.ts";

const DAY = 86_400_000;
const isCafe = (i: SavedItem) => i.tags.some((t) => t === "coffee" || t === "cafe");

/** "you two have saved 7 things this week" — only when there's something to say. */
export function lately(items: SavedItem[], now = new Date()): string {
  const n = items.filter((i) => now.getTime() - new Date(i.created_at).getTime() <= 7 * DAY).length;
  if (n < 3) return "";
  return `you two have saved ${n} things this week.`;
}

/** Up to `max` observations, most striking first. Returns [] when there isn't enough data. */
/** `mutualItems` = the items you both like (see shared.ts), so this file stays free of reaction plumbing. */
export function insights(items: SavedItem[], mutualItems: SavedItem[], now = new Date(), max = 2): string[] {
  const out: string[] = [];
  const recent = items.filter((i) => now.getTime() - new Date(i.created_at).getTime() <= 30 * DAY);

  const activities = items.filter((i) => i.category === "do");
  const activitiesDone = activities.filter((i) => i.status === "done").length;
  if (activities.length >= 4 && activitiesDone === 0) out.push("you haven't tried any of your saved activities yet.");

  const movies = items.filter((i) => i.category === "watch");
  const watched = movies.filter((i) => i.status === "done").length;
  if (movies.length >= 5 && movies.length - watched >= 3) out.push(`you've saved ${movies.length} movies but watched ${watched} 😭`);

  const mutualActivities = mutualItems.filter((i) => i.category === "do" && i.status !== "done").length;
  if (mutualActivities >= 3) out.push(`you have ${mutualActivities} activities you've both liked.`);

  const foodRecent = recent.filter((i) => i.category === "eat").length;
  if (recent.length >= 6 && foodRecent >= 4 && foodRecent / recent.length >= 0.45) out.push("you've saved a lot of food lately 👀");

  const cafes = items.filter(isCafe);
  if (cafes.length >= 3 && new Set(cafes.map((c) => c.created_by)).size === 2) out.push("you both keep saving cafés.");

  const month = now.getMonth(), year = now.getFullYear();
  const visited = items.filter((i) => i.status === "done" && (i.category === "places" || i.category === "eat") && new Date(i.updated_at).getMonth() === month && new Date(i.updated_at).getFullYear() === year).length;
  if (visited >= 2) out.push(`you visited ${visited} new places this month.`);

  return out.slice(0, max);
}
