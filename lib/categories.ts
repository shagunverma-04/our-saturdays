import type { CategoryId, SavedItem, Status } from "./types";

export interface Category {
  id: CategoryId;
  label: string;
  addLabel: string; // label used in the "what are we saving?" sheet
  emoji: string;
  tint: string; // pastel surface
  deep: string; // slightly deeper tone for accents
  empty: string;
}

export const CATEGORIES: Category[] = [
  { id: "places", label: "places", addLabel: "Place", emoji: "📍", tint: "var(--t-places)", deep: "var(--d-places)", empty: "we haven't found our next place yet 👀" },
  { id: "eat", label: "eat", addLabel: "Food", emoji: "🍜", tint: "var(--t-eat)", deep: "var(--d-eat)", empty: "nothing to eat yet. dangerous." },
  { id: "watch", label: "watch", addLabel: "Movie", emoji: "🎬", tint: "var(--t-watch)", deep: "var(--d-watch)", empty: "no movie night lined up yet 🍿" },
  { id: "do", label: "do", addLabel: "Activity", emoji: "🎨", tint: "var(--t-do)", deep: "var(--d-do)", empty: "what should we try for the first time?" },
  { id: "shop", label: "shop", addLabel: "Thing", emoji: "🛍️", tint: "var(--t-shop)", deep: "var(--d-shop)", empty: "nothing on the wish list. suspicious." },
  { id: "travel", label: "travel", addLabel: "Trip", emoji: "✈️", tint: "var(--t-travel)", deep: "var(--d-travel)", empty: "where are we going next?" },
  { id: "ideas", label: "ideas", addLabel: "Idea", emoji: "💡", tint: "var(--t-ideas)", deep: "var(--d-ideas)", empty: "no ideas yet. say something silly." },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export const STATUSES: { id: Status; label: string }[] = [
  { id: "saved", label: "saved" },
  { id: "planned", label: "planned" },
  { id: "done", label: "done" },
  { id: "maybe", label: "maybe" },
  { id: "archived", label: "archived" },
];

// tags can sharpen the little object on a card (schema stays clean: no emoji column)
const TAG_EMOJI: Record<string, string> = {
  ramen: "🍜", coffee: "☕", cafe: "☕", bar: "🍸", pub: "🍻", pottery: "🏺", kayak: "🛶",
  concert: "🎤", hotel: "🏨", beach: "🏖️", sunrise: "🌅", books: "📚", dance: "💃",
  camera: "📷", shirt: "👕", pasta: "🍝", picnic: "🧺", climbing: "🧗", hike: "🥾", pizza: "🍕",
  dessert: "🍰", brunch: "🥞", music: "🎵", trek: "⛰️",
};

/** Which hand-drawn icon best fits an item: a coffee spot gets the cup, not the sushi it'd get as "eat". */
export function iconFor(item: Pick<SavedItem, "category" | "tags">): CategoryId {
  return item.tags.some((t) => t === "coffee" || t === "cafe") ? "places" : item.category;
}

export function itemEmoji(item: Pick<SavedItem, "category" | "tags">): string {
  for (const t of item.tags) {
    const e = TAG_EMOJI[t.toLowerCase()];
    if (e) return e;
  }
  return CATEGORY_BY_ID[item.category].emoji;
}
