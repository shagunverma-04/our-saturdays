import type { CategoryId, Interaction, InteractionType, Plan, Profile, SavedItem, Status } from "./types";
import { toISODate } from "./utils";

export const DEFAULT_PROFILES: Profile[] = [
  { id: "u1", name: "Shagun", avatar: "🧢", photo: "" },
  { id: "u2", name: "Boyfriend", avatar: "🌿", photo: "" },
];

const DAY = 86_400_000;

interface Seed {
  key: string;
  title: string;
  category: CategoryId;
  description: string;
  location_name?: string;
  by: "u1" | "u2";
  ago: number; // days ago saved
  status?: Status;
  inDays?: number; // release/event date relative to today
  tags?: string[];
  source_url?: string;
  notes?: string;
}

const SEEDS: Seed[] = [
  { key: "ramen", title: "Ramen Tei", category: "eat", description: "that tiny ramen place with the 6 seats", location_name: "Koramangala, Bengaluru", by: "u2", ago: 47, tags: ["ramen"], source_url: "https://www.instagram.com/reel/C9-ramen-tei/" },
  { key: "clay", title: "Clay Station", category: "do", description: "Pottery workshop", location_name: "Bengaluru", by: "u1", ago: 31, tags: ["pottery"], source_url: "https://www.instagram.com/p/Cx-clay-station/", notes: "2 hr wheel session, book ahead for Saturday" },
  { key: "toit", title: "Toit", category: "eat", description: "Brewpub in Indiranagar", location_name: "Indiranagar, Bengaluru", by: "u2", ago: 2, tags: ["pub"], source_url: "https://maps.app.goo.gl/toit-indiranagar" },
  { key: "movie", title: "Last Train to Lisbon", category: "watch", description: "Releases this Friday", by: "u1", ago: 9, inDays: 5, tags: ["movie"], source_url: "https://www.youtube.com/watch?v=lisbon-trailer" },
  { key: "concert", title: "Prateek Kuhad live", category: "do", description: "Open-air gig, get tickets early", location_name: "Jayamahal Palace, Bengaluru", by: "u1", ago: 12, inDays: 6, tags: ["concert"] },
  { key: "goa", title: "Casa Sunset, Anjuna", category: "travel", description: "Little hotel 5 min from the beach", location_name: "Goa", by: "u2", ago: 20, inDays: 34, tags: ["hotel"], source_url: "https://www.instagram.com/p/Cz-casa-sunset/" },
  { key: "kayak", title: "Sunset kayaking", category: "do", description: "Two-seater kayak on the lake at golden hour", location_name: "Bheemeshwari", by: "u2", ago: 6, tags: ["kayak"] },
  { key: "champaca", title: "Champaca Bookstore", category: "places", description: "Books, chai, and nowhere to be", location_name: "Langford Town, Bengaluru", by: "u1", ago: 15, tags: ["books"] },
  { key: "nandi", title: "Nandi Hills sunrise", category: "places", description: "Leave at 4am, regret nothing", location_name: "Nandi Hills", by: "u2", ago: 58, status: "maybe", tags: ["sunrise"] },
  { key: "roastery", title: "The Roastery on 12th", category: "eat", description: "Pour-overs and a very good cardamom bun", location_name: "HSR Layout, Bengaluru", by: "u1", ago: 4, tags: ["coffee"] },
  { key: "salsa", title: "Beginner salsa night", category: "do", description: "Two left feet, one very good time", location_name: "Bengaluru", by: "u2", ago: 22, tags: ["dance"] },
  { key: "camera", title: "Instant camera", category: "shop", description: "for the Goa trip photos", by: "u1", ago: 11, tags: ["camera"] },
  { key: "shirt", title: "Linen shirts for Goa", category: "shop", description: "matching-ish. not matching. maybe.", by: "u2", ago: 8, tags: ["shirt"] },
  { key: "pasta", title: "Make pasta from scratch", category: "ideas", description: "flour everywhere, wine open", by: "u1", ago: 3, tags: ["pasta"] },
  { key: "picnic", title: "Cubbon Park picnic", category: "places", description: "the blanket one", location_name: "Cubbon Park", by: "u1", ago: 40, status: "done", tags: ["picnic"] },
  { key: "pastlives", title: "Past Lives", category: "watch", description: "", by: "u2", ago: 70, status: "done", tags: ["movie"] },
  { key: "climb", title: "Bouldering at Adventure Ground", category: "do", description: "sore for 3 days, worth it", by: "u1", ago: 55, status: "done", tags: ["climbing"] },
  { key: "coorg", title: "Coorg weekend", category: "travel", description: "rain, coffee estates, board games", location_name: "Coorg", by: "u2", ago: 120, status: "done", tags: ["trek"] },
];

// [item key, who reacted, what, days ago]
const REACTIONS: Array<[string, "u1" | "u2", InteractionType, number]> = [
  ["clay", "u2", "like", 5],
  ["ramen", "u1", "like", 20],
  ["ramen", "u1", "saturday", 1],
  ["ramen", "u2", "saturday", 1],
  ["roastery", "u2", "interested", 1],
  ["kayak", "u1", "like", 3],
  ["goa", "u1", "like", 12],
  ["concert", "u2", "saturday", 1],
  ["salsa", "u1", "interested", 2],
];

export function buildSeed(now = new Date()): { items: SavedItem[]; plans: Plan[]; interactions: Interaction[] } {
  const items: SavedItem[] = SEEDS.map((s) => {
    const created = new Date(now.getTime() - s.ago * DAY).toISOString();
    return {
      id: `seed-${s.key}`,
      created_by: s.by,
      title: s.title,
      category: s.category,
      description: s.description,
      image_url: "",
      source_url: s.source_url ?? "",
      location_name: s.location_name ?? "",
      status: s.status ?? "saved",
      release_date: s.inDays === undefined ? "" : toISODate(new Date(now.getTime() + s.inDays * DAY)),
      notes: s.notes ?? "",
      tags: s.tags ?? [],
      created_at: created,
      updated_at: created,
    };
  });
  const interactions: Interaction[] = REACTIONS.map(([key, by, type, ago], n) => ({
    id: `seed-int-${n}`,
    saved_item_id: `seed-${key}`,
    user_id: by,
    type,
    created_at: new Date(now.getTime() - ago * DAY).toISOString(),
  }));
  return { items, plans: [], interactions };
}
