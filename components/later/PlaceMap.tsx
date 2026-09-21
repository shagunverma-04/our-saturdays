"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/apiClient";
import { updateItem } from "@/lib/store";
import type { SavedItem } from "@/lib/types";

/**
 * A small OpenStreetMap preview of a saved place. Free: no key, no account. Coordinates are looked up once (only when you
 * tap the button) and saved, so the map loads instantly next time and we stay a polite user of the free lookup service.
 */
export function PlaceMap({ item }: { item: SavedItem }) {
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const lat = item.latitude, lon = item.longitude;
  const has = typeof lat === "number" && typeof lon === "number";
  if (!item.location_name && !has) return null;

  const find = async () => {
    setBusy(true);
    setMissing(false);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(item.location_name)}`, { headers: await authHeaders() });
      const j = (await r.json()) as { lat?: number; lon?: number };
      if (typeof j.lat === "number" && typeof j.lon === "number") updateItem(item.id, { latitude: j.lat, longitude: j.lon });
      else setMissing(true);
    } catch {
      setMissing(true);
    } finally {
      setBusy(false);
    }
  };

  if (!has) {
    return (
      <div>
        <button type="button" onClick={find} disabled={busy} className="flex h-11 items-center gap-2 rounded-full bg-ink/[0.07] px-4 text-[14px] font-semibold disabled:opacity-50"><span aria-hidden>🗺️</span> {busy ? "finding it…" : "show on map"}</button>
        {missing && <p role="status" className="mt-2 px-1 text-sm text-mute">couldn&apos;t find that place. try a fuller name in the place field?</p>}
      </div>
    );
  }
  const d = 0.012;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon! - d}%2C${lat! - d * 0.6}%2C${lon! + d}%2C${lat! + d * 0.6}&layer=mapnik&marker=${lat}%2C${lon}`;
  return (
    <div className="overflow-hidden rounded-card shadow-soft">
      <iframe title={`map of ${item.location_name}`} src={src} loading="lazy" className="block h-52 w-full border-0" referrerPolicy="no-referrer" />
      <p className="bg-card px-4 py-2 text-[11px] text-mute">© OpenStreetMap contributors</p>
    </div>
  );
}
