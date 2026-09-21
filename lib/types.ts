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
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface Plan {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: CategoryId;
  saved_item_id: string | null;
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
