// Types mirror supabase/schema.sql (snake_case) so swapping the local store
// for Supabase later doesn't ripple through the UI.

export type CategoryId = "places" | "eat" | "watch" | "do" | "shop" | "travel" | "ideas";

export type Status = "saved" | "planned" | "done" | "maybe" | "archived";

export interface Profile {
  id: string;
  name: string;
  avatar: string; // emoji fallback
  photo: string; // optional profile photo reference ("" = none); see lib/media.ts
}

export interface SavedItem {
  id: string;
  created_by: string;
  title: string;
  category: CategoryId;
  description: string;
  image_url: string;
  source_url: string;
  location_name: string;
  status: Status;
  release_date: string; // YYYY-MM-DD or ""
  notes: string;
  tags: string[];
  latitude?: number | null; // filled in when you tap "show on map"
  longitude?: number | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface Plan {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: CategoryId;
  saved_item_id: string | null;
  time?: string | null; // HH:MM, optional ("saturday · 6 pm")
  created_at: string;
}

export type NewItemInput = Pick<SavedItem, "title" | "category"> &
  Partial<Omit<SavedItem, "id" | "created_by" | "created_at" | "updated_at" | "title" | "category">>;

export type InteractionType = "like" | "interested" | "saturday" | "done" | "dismissed";

/** One person's lightweight reaction to a shared find. The creator's own interest is implicit (no row). */
export interface Interaction {
  id: string;
  saved_item_id: string;
  user_id: string;
  type: InteractionType;
  created_at: string;
}

/** A moment worth keeping: photos plus a few words. Never liked, never commented on — just ours. */
export interface Memory {
  id: string;
  created_by: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD — when it happened, not when it was saved
  location: string;
  saved_item_id: string | null; // the find this came from, if any ("it becomes a memory")
  trip_id?: string | null; // the trip it belongs to, if any
  photos: string[]; // ordered photo references (see lib/media.ts)
  created_at: string;
}

export type NewMemoryInput = Pick<Memory, "title"> & Partial<Omit<Memory, "id" | "created_by" | "created_at" | "title">>;

// ---- drawings, trips, games ---------------------------------------------------

/** A doodle one of you sent the other. `image` is a photo-style reference (see lib/media.ts). */
export interface Drawing {
  id: string;
  created_by: string;
  image: string;
  caption: string;
  seen_by: string[];
  created_at: string;
}

export type TripItemType = "place" | "food" | "stay" | "activity" | "other";
export type ExpenseCategory = "stay" | "food" | "travel" | "activities" | "shopping" | "other";

export interface TripItem {
  id: string;
  trip_id: string;
  saved_item_id: string | null; // the find it came from, if any
  item_type: TripItemType;
  title: string;
  location: string;
  scheduled_date: string; // YYYY-MM-DD or "" (not on the itinerary yet)
  scheduled_time: string; // HH:MM or ""
  notes: string;
}

export interface TripExpense {
  id: string;
  trip_id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  paid_by: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string; // YYYY-MM-DD or ""
  end_date: string;
  notes: string;
  budget_estimate: number | null;
  created_at: string;
  items: TripItem[];
  expenses: TripExpense[];
}

export type NewTripInput = Pick<Trip, "title"> & Partial<Pick<Trip, "destination" | "start_date" | "end_date" | "notes" | "budget_estimate">>;

export type GameType = "guess_word" | "who_saved" | "remember_when";

export interface GameAttempt {
  id: string;
  game_id: string;
  user_id: string;
  guess: string;
  correct: boolean;
  created_at: string;
}

export interface Game {
  id: string;
  type: GameType;
  created_by: string;
  prompt: string; // guess_word: the question; who_saved / remember_when: the id of the find / memory
  answer: string;
  hint: string;
  created_at: string;
  attempts: GameAttempt[];
}
