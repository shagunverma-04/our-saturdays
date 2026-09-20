export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const DAY = 86_400_000;

export function toISODate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a *local* date (new Date("2026-01-01") would be UTC). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** The coming Saturday. If today *is* Saturday, that's today. */
export function nextSaturday(now = new Date()): Date {
  const t = startOfToday(now);
  const add = (6 - t.getDay() + 7) % 7;
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + add);
}

export function daysUntil(iso: string, now = new Date()): number {
  return Math.round((fromISODate(iso).getTime() - startOfToday(now).getTime()) / DAY);
}

export function daysSince(iso: string, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY));
}

export function timeAgo(iso: string, now = new Date()): string {
  const d = daysSince(iso, now);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function shortDate(iso: string): string {
  const d = fromISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "today", "tomorrow", "friday", or "oct 24" */
export function friendlyDay(iso: string, now = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n > 1 && n < 7) return WEEKDAYS[fromISODate(iso).getDay()];
  return shortDate(iso);
}

export function countdown(iso: string, now = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "today!";
  if (n === 1) return "tomorrow";
  if (n < 0) return "passed";
  return `in ${n} days`;
}

// ---- links -----------------------------------------------------------------

export function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function looksLikeUrl(s: string): boolean {
  const t = s.trim();
  if (/\s/.test(t)) return false;
  return /^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(t);
}

export interface SourceInfo {
  label: string;
  host: string;
  dot: string;
}

/** Identify where a link came from. We only ever *save* URLs — no scraping. */
export function sourceInfo(url: string): SourceInfo | null {
  if (!url) return null;
  try {
    const u = new URL(normalizeUrl(url));
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname;
    if (host.endsWith("instagram.com")) return { label: "Instagram", host, dot: "#E1306C" };
    if (host.endsWith("youtube.com") || host === "youtu.be") return { label: "YouTube", host, dot: "#FF0000" };
    if (host === "maps.app.goo.gl" || host === "goo.gl" || (host.startsWith("google.") && path.startsWith("/maps")) || host === "maps.google.com")
      return { label: "Google Maps", host, dot: "#34A853" };
    if (host.endsWith("bookmyshow.com")) return { label: "BookMyShow", host, dot: "#C4242B" };
    if (host.endsWith("imdb.com")) return { label: "IMDb", host, dot: "#E0B100" };
    return { label: host, host, dot: "#8b8a85" };
  } catch {
    return null;
  }
}

/** Free "open in maps" link from a place name — no API key involved. */
export function mapsSearchUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
