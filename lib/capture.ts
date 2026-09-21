"use client";

// SEE something → SHARE → our saturdays → DONE. One function turns a link into a saved find right away
// (so it syncs instantly), then quietly fills in a real title/image when a preview is available.
// We only ever store the link: no scraping of Instagram/TikTok, no paid APIs.

import { findItemByUrl, getItemNow, addItem, updateItem } from "./store";
import { authHeaders } from "./apiClient";
import type { CategoryId, SavedItem } from "./types";
import { normalizeUrl, sourceInfo, sourceWord } from "./utils";

const URL_RE = /https?:\/\/[^\s<>"']+/i;

/** First link found in any of the strings (share sheets often put it in `text`, not `url`). */
export function extractUrl(...parts: Array<string | null | undefined>): string | null {
  for (const p of parts) {
    const m = p?.match(URL_RE);
    if (m) return m[0].replace(/[).,;!?]+$/, "");
  }
  return null;
}

/** A sensible default so nobody has to pick a category to save something. Editable any time. */
export function guessCategory(url: string): CategoryId {
  const label = sourceInfo(url)?.label;
  if (label === "Google Maps") return "places";
  if (label === "YouTube" || label === "IMDb" || label === "BookMyShow") return "watch";
  return "ideas";
}

export function fallbackTitle(url: string): string {
  const info = sourceInfo(url);
  if (!info) return "Saved link";
  const w = sourceWord(url);
  return `Saved from ${w === "web" ? info.host : w}`;
}

export interface Preview {
  title?: string;
  image?: string;
  site?: string;
  location?: string;
}

export async function fetchPreview(url: string): Promise<Preview | null> {
  try {
    const r = await fetch(`/api/preview?url=${encodeURIComponent(normalizeUrl(url))}`, { headers: await authHeaders() });
    return r.ok ? ((await r.json()) as Preview) : null;
  } catch {
    return null; // offline or blocked: the placeholder title stands
  }
}

export interface Captured {
  item: SavedItem;
  duplicate: boolean;
}

/** Save a link. Returns immediately; enrichment happens in the background. */
export function captureLink(raw: string): Captured {
  const url = normalizeUrl(raw);
  const existing = findItemByUrl(url);
  if (existing) return { item: existing, duplicate: true };
  const placeholder = fallbackTitle(url);
  const item = addItem({ title: placeholder, category: guessCategory(url), source_url: url });
  void enrich(item.id, url, placeholder);
  return { item, duplicate: false };
}

async function enrich(id: string, url: string, placeholder: string) {
  const p = await fetchPreview(url);
  if (!p) return;
  const cur = getItemNow(id);
  if (!cur) return;
  const patch: Partial<SavedItem> = {};
  // never overwrite something the user already typed
  if (p.title && cur.title === placeholder) patch.title = p.title.slice(0, 120);
  if (p.image && !cur.image_url) patch.image_url = p.image;
  if (p.location && !cur.location_name) patch.location_name = p.location;
  if (Object.keys(patch).length) updateItem(id, patch);
}
