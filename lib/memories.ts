// Pure helpers for the memory journal (no React, so they're unit-tested).

import type { Memory } from "./types.ts";

export interface MonthGroup {
  key: string; // "2026-09"
  label: string; // "september 2026"
  memories: Memory[];
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Newest month first; inside a month, newest day first (ties: most recently added first). */
export function groupByMonth(memories: Memory[]): MonthGroup[] {
  const sorted = [...memories].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  const groups: MonthGroup[] = [];
  for (const m of sorted) {
    const key = m.date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const [y, mo] = key.split("-").map(Number);
      g = { key, label: `${MONTHS[(mo ?? 1) - 1]} ${y}`, memories: [] };
      groups.push(g);
    }
    g.memories.push(m);
  }
  return groups;
}

/** "thursday, sep 17, 2026" — parsed as a LOCAL date (new Date("2026-09-17") would be UTC and can slip a day). */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const wk = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dt.getDay()];
  return `${wk}, ${MONTHS[dt.getMonth()].slice(0, 3)} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/** How long ago, in words a person would say. */
export function howLongAgo(iso: string, now = new Date()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(y, (m ?? 1) - 1, d ?? 1).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 730) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

/**
 * The memory to resurface on Home: something brand new (last 14 days) wins; otherwise a stable "remember this?"
 * from further back, chosen by the calendar day so it doesn't flicker between renders.
 */
export function homeMemory(memories: Memory[], now = new Date()): { memory: Memory; fresh: boolean } | null {
  if (!memories.length) return null;
  const today = now.toISOString().slice(0, 10);
  const byNew = [...memories].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const cutoff = now.getTime() - 14 * 86_400_000;
  if (new Date(byNew[0].created_at).getTime() >= cutoff) return { memory: byNew[0], fresh: true };
  const older = memories.filter((m) => new Date(m.created_at).getTime() < cutoff);
  if (!older.length) return null;
  let h = 0;
  for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { memory: older[h % older.length], fresh: false };
}

/** Newest first (by the day it happened; ties → most recently added). The order photos are swiped in. */
export function sortMemories(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}

/** A name for a memory nobody named: "sunday, sep 21". */
export function autoTitle(iso: string): string {
  return longDate(iso).replace(/, \d{4}$/, "");
}
