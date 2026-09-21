// Optional Saturday time + "add to my calendar". No calendar API, no account: a standard .ics file (opens in
// Apple / Google / Outlook calendars) and a Google Calendar link. Pure, so it's unit-tested.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "18:00" → "6 PM", "18:30" → "6:30 PM", "00:00" → "12 AM". Anything else → "". */
export function formatTime12(hhmm: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return "";
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return "";
  return `${h % 12 === 0 ? 12 : h % 12}${min ? `:${String(min).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** "saturday · 6 PM" (or just "saturday"). Time is optional, always. */
export function whenLabel(dateIso: string, time?: string | null): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const day = WEEKDAYS[new Date(y, (m ?? 1) - 1, d ?? 1).getDay()];
  const t = formatTime12(time);
  return t ? `${day} · ${t}` : day;
}

export interface CalendarEventInput {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM, else all-day
  location?: string;
  description?: string;
  minutes?: number; // duration when a time is set (default 2 h)
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const compact = (dateIso: string) => dateIso.replace(/-/g, "");

/** RFC 5545 folding: lines longer than 75 octets continue on the next line after one space. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (bytes.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function endOf(ev: CalendarEventInput): { start: string; end: string; allDay: boolean } {
  if (!ev.time || !/^\d{2}:\d{2}/.test(ev.time)) {
    const [y, m, d] = ev.date.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    return { start: compact(ev.date), end: `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`, allDay: true };
  }
  const [y, m, d] = ev.date.split("-").map(Number);
  const [h, mi] = ev.time.split(":").map(Number);
  const e = new Date(Date.UTC(y, m - 1, d, h, mi + (ev.minutes ?? 120)));
  const p = (n: number) => String(n).padStart(2, "0");
  return { start: `${compact(ev.date)}T${p(h)}${p(mi)}00`, end: `${e.getUTCFullYear()}${p(e.getUTCMonth() + 1)}${p(e.getUTCDate())}T${p(e.getUTCHours())}${p(e.getUTCMinutes())}00`, allDay: false };
}

/** A one-event .ics. Times are "floating" (your local time, wherever you open it), which is what "6 PM Saturday" means. */
export function buildIcs(ev: CalendarEventInput, now = new Date()): string {
  const t = endOf(ev);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//our saturdays//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@our-saturdays`,
    `DTSTAMP:${stamp}`,
    t.allDay ? `DTSTART;VALUE=DATE:${t.start}` : `DTSTART:${t.start}`,
    t.allDay ? `DTEND;VALUE=DATE:${t.end}` : `DTEND:${t.end}`,
    `SUMMARY:${esc(ev.title)}`,
    ...(ev.location ? [`LOCATION:${esc(ev.location)}`] : []),
    ...(ev.description ? [`DESCRIPTION:${esc(ev.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(ev: CalendarEventInput): string {
  const t = endOf(ev);
  const q = new URLSearchParams({ action: "TEMPLATE", text: ev.title, dates: `${t.start}/${t.end}` });
  if (ev.location) q.set("location", ev.location);
  if (ev.description) q.set("details", ev.description);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
