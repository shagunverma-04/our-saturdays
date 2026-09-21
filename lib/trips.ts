// Pure helpers for trips: itinerary layout, budget maths, countdowns, and which tab an item belongs to.
import type { CategoryId, ExpenseCategory, SavedItem, Trip, TripItem, TripItemType } from "./types.ts";

const DAY = 86_400_000;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const local = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Every date of the trip (inclusive), capped at 60 so a typo'd year can't make a thousand days. */
export function tripDates(trip: Pick<Trip, "start_date" | "end_date">): string[] {
  if (!trip.start_date) return [];
  const start = local(trip.start_date);
  const end = trip.end_date && trip.end_date >= trip.start_date ? local(trip.end_date) : start;
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 60; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) out.push(iso(d));
  return out;
}

export function dayLabel(dateIso: string, index?: number): string {
  const d = local(dateIso);
  const base = `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return index === undefined ? base : `day ${index + 1} · ${base}`;
}

const byTime = (a: TripItem, b: TripItem) => (a.scheduled_time || "99:99").localeCompare(b.scheduled_time || "99:99") || a.title.localeCompare(b.title);

export interface ItineraryDay {
  date: string;
  label: string;
  items: TripItem[];
}

/** Days of the trip (plus any stray scheduled day outside the dates), with items in time order; the rest are "unscheduled". */
export function itinerary(trip: Trip): { days: ItineraryDay[]; unscheduled: TripItem[] } {
  const dates = new Set(tripDates(trip));
  for (const it of trip.items) if (it.scheduled_date) dates.add(it.scheduled_date);
  const sorted = [...dates].sort();
  return {
    days: sorted.map((date, i) => ({ date, label: dayLabel(date, i), items: trip.items.filter((it) => it.scheduled_date === date).sort(byTime) })),
    unscheduled: trip.items.filter((it) => !it.scheduled_date).sort((a, b) => a.title.localeCompare(b.title)),
  };
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["stay", "food", "travel", "activities", "shopping", "other"];

export interface BudgetSummary {
  estimate: number | null;
  spent: number;
  remaining: number | null; // negative when over
  overBy: number; // 0 when within budget
  byCategory: Array<{ category: ExpenseCategory; amount: number; pct: number }>; // only categories with spend, biggest first
}

export function budgetSummary(trip: Pick<Trip, "budget_estimate" | "expenses">): BudgetSummary {
  const spent = round2(trip.expenses.reduce((s, e) => s + e.amount, 0));
  const totals = new Map<ExpenseCategory, number>();
  for (const e of trip.expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  const est = trip.budget_estimate;
  return {
    estimate: est,
    spent,
    remaining: est == null ? null : round2(est - spent),
    overBy: est != null && spent > est ? round2(spent - est) : 0,
    byCategory: [...totals]
      .map(([category, amount]) => ({ category, amount: round2(amount), pct: spent > 0 ? Math.round((amount / spent) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount),
  };
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** ₹12,000 / ₹1,20,000 (Indian digit grouping), no decimals unless there are paise. */
export function formatINR(n: number): string {
  const whole = Number.isInteger(n);
  return "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(n);
}

export function tripCountdown(trip: Pick<Trip, "start_date" | "end_date">, now = new Date()): string {
  if (!trip.start_date) return "dates to be decided";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start = local(trip.start_date).getTime();
  const end = (trip.end_date ? local(trip.end_date) : local(trip.start_date)).getTime();
  const untilStart = Math.round((start - today) / DAY);
  if (untilStart > 1) return `in ${untilStart} days`;
  if (untilStart === 1) return "tomorrow!";
  if (today <= end) return untilStart === 0 && today === start ? "starts today!" : `day ${Math.round((today - start) / DAY) + 1} of ${Math.round((end - start) / DAY) + 1}`;
  const ago = Math.round((today - end) / DAY);
  return ago < 14 ? `${ago} day${ago === 1 ? "" : "s"} ago` : ago < 60 ? `${Math.round(ago / 7)} weeks ago` : `${Math.round(ago / 30)} months ago`;
}

export function dateRangeLabel(trip: Pick<Trip, "start_date" | "end_date">): string {
  if (!trip.start_date) return "";
  const a = local(trip.start_date);
  if (!trip.end_date || trip.end_date === trip.start_date) return `${MONTHS[a.getMonth()]} ${a.getDate()}`;
  const b = local(trip.end_date);
  return a.getMonth() === b.getMonth() ? `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}` : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}

export const TRIP_TABS = [
  { id: "overview", label: "overview" },
  { id: "place", label: "places" },
  { id: "food", label: "food" },
  { id: "stay", label: "stay" },
  { id: "activity", label: "things to do" },
  { id: "itinerary", label: "itinerary" },
  { id: "budget", label: "budget" },
  { id: "memories", label: "memories" },
] as const;

/** Which trip list a find naturally belongs in. */
export function itemTypeForCategory(c: CategoryId): TripItemType {
  return ({ places: "place", eat: "food", travel: "stay", do: "activity", watch: "activity", shop: "other", ideas: "other" } as const)[c];
}

export const TYPE_EMOJI: Record<TripItemType, string> = { place: "📍", food: "🍽️", stay: "🏨", activity: "🎯", other: "📌" };

/** Finds that already look like they're for this trip: the destination appears in the place or title. */
export function suggestedFinds(trip: Pick<Trip, "destination" | "items">, items: SavedItem[]): SavedItem[] {
  const dest = trip.destination.trim().toLowerCase();
  if (!dest) return [];
  const linked = new Set(trip.items.map((i) => i.saved_item_id).filter(Boolean));
  return items.filter((i) => i.status !== "done" && i.status !== "archived" && !linked.has(i.id) && `${i.location_name} ${i.title}`.toLowerCase().includes(dest));
}
