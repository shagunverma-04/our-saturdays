import assert from "node:assert/strict";
import test from "node:test";
import { budgetSummary, dateRangeLabel, dayLabel, formatINR, itemTypeForCategory, itinerary, suggestedFinds, tripCountdown, tripDates } from "../lib/trips.ts";
import type { SavedItem, Trip, TripExpense, TripItem } from "../lib/types.ts";

let n = 0;
const item = (o: Partial<TripItem> = {}): TripItem => ({ id: `i${++n}`, trip_id: "t", saved_item_id: null, item_type: "other", title: "x", location: "", scheduled_date: "", scheduled_time: "", notes: "", ...o });
const exp = (amount: number, category: TripExpense["category"] = "food"): TripExpense => ({ id: `e${++n}`, trip_id: "t", category, amount, description: "", paid_by: null, created_at: "" });
const trip = (o: Partial<Trip> = {}): Trip => ({ id: "t", title: "Goa", destination: "Goa", start_date: "2026-10-24", end_date: "2026-10-27", notes: "", budget_estimate: 12000, created_at: "", items: [], expenses: [], ...o });

test("trip dates are inclusive, capped, and tolerant of bad input", () => {
  assert.deepEqual(tripDates(trip()), ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]);
  assert.deepEqual(tripDates(trip({ end_date: "" })), ["2026-10-24"]);
  assert.deepEqual(tripDates(trip({ end_date: "2026-10-20" })), ["2026-10-24"], "end before start → just the start");
  assert.deepEqual(tripDates(trip({ start_date: "", end_date: "" })), []);
  assert.equal(tripDates(trip({ start_date: "2026-01-01", end_date: "2030-01-01" })).length, 60, "capped");
  assert.deepEqual(tripDates(trip({ start_date: "2026-12-30", end_date: "2027-01-02" })), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
});

test("itinerary: days in order, items in time order (untimed last), unscheduled separate", () => {
  const t = trip({ items: [item({ title: "Dinner", scheduled_date: "2026-10-25", scheduled_time: "20:30" }), item({ title: "Breakfast", scheduled_date: "2026-10-25", scheduled_time: "09:00" }), item({ title: "Beach", scheduled_date: "2026-10-25" }), item({ title: "Fort", scheduled_date: "2026-10-26", scheduled_time: "12:00" }), item({ title: "Scuba" })] });
  const it = itinerary(t);
  assert.equal(it.days.length, 4);
  assert.deepEqual(it.days[1].items.map((i) => i.title), ["Breakfast", "Dinner", "Beach"]);
  assert.equal(it.days[1].label, "day 2 · sun, oct 25");
  assert.deepEqual(it.unscheduled.map((i) => i.title), ["Scuba"]);
  const stray = itinerary(trip({ items: [item({ title: "Airport", scheduled_date: "2026-10-23" })] }));
  assert.equal(stray.days[0].date, "2026-10-23", "a day outside the dates still shows up, not lost");
  assert.equal(dayLabel("2026-10-24"), "sat, oct 24");
});

test("budget: totals, remaining, over-budget, category split (no rounding drift)", () => {
  const b = budgetSummary(trip({ expenses: [exp(450.5, "food"), exp(3000, "stay"), exp(549.5, "food")] }));
  assert.equal(b.spent, 4000);
  assert.equal(b.remaining, 8000);
  assert.equal(b.overBy, 0);
  assert.deepEqual(b.byCategory.map((c) => [c.category, c.amount, c.pct]), [["stay", 3000, 75], ["food", 1000, 25]]);
  const over = budgetSummary(trip({ budget_estimate: 3000, expenses: [exp(3500.25)] }));
  assert.deepEqual([over.remaining, over.overBy], [-500.25, 500.25]);
  const none = budgetSummary(trip({ budget_estimate: null, expenses: [exp(0.1), exp(0.2)] }));
  assert.deepEqual([none.estimate, none.remaining, none.spent], [null, null, 0.3], "0.1 + 0.2 stays 0.3");
  assert.deepEqual(budgetSummary(trip({ expenses: [] })).byCategory, []);
});

test("rupee formatting uses Indian grouping", () => {
  assert.equal(formatINR(12000), "₹12,000");
  assert.equal(formatINR(120000), "₹1,20,000");
  assert.equal(formatINR(7450.5), "₹7,450.50");
  assert.equal(formatINR(0), "₹0");
});

test("countdown reads naturally before, during, and after", () => {
  const t = (now: string) => tripCountdown(trip(), new Date(`${now}T10:00:00`));
  assert.equal(t("2026-09-20"), "in 34 days");
  assert.equal(t("2026-10-23"), "tomorrow!");
  assert.equal(t("2026-10-24"), "starts today!");
  assert.equal(t("2026-10-26"), "day 3 of 4");
  assert.equal(t("2026-10-27"), "day 4 of 4");
  assert.equal(t("2026-10-29"), "2 days ago");
  assert.equal(t("2026-12-30"), "2 months ago");
  assert.equal(tripCountdown(trip({ start_date: "" })), "dates to be decided");
  assert.equal(dateRangeLabel(trip()), "oct 24–27");
  assert.equal(dateRangeLabel(trip({ end_date: "2026-11-02" })), "oct 24 – nov 2");
  assert.equal(dateRangeLabel(trip({ end_date: "" })), "oct 24");
});

test("finds map to the right list, and destination matches are suggested (once)", () => {
  assert.deepEqual((["places", "eat", "travel", "do", "watch", "shop", "ideas"] as const).map(itemTypeForCategory), ["place", "food", "stay", "activity", "activity", "other", "other"]);
  const find = (id: string, o: Partial<SavedItem>): SavedItem => ({ id, created_by: "u", title: "", category: "eat", description: "", image_url: "", source_url: "", location_name: "", status: "saved", release_date: "", notes: "", tags: [], created_at: "", updated_at: "", ...o });
  const finds = [find("a", { title: "Fish thali", location_name: "Panjim, Goa" }), find("b", { title: "Toit", location_name: "Indiranagar" }), find("c", { title: "Goa hotel" }), find("d", { title: "Old goa church", status: "done" }), find("e", { title: "Linked", location_name: "Goa" })];
  const t = trip({ items: [item({ saved_item_id: "e" })] });
  assert.deepEqual(suggestedFinds(t, finds).map((f) => f.id), ["a", "c"]);
  assert.deepEqual(suggestedFinds(trip({ destination: "" }), finds), []);
});
