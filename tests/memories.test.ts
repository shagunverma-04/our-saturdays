import assert from "node:assert/strict";
import test from "node:test";
import { activityFeed } from "../lib/activity.ts";
import { autoTitle, groupByMonth, homeMemory, howLongAgo, longDate, sortMemories } from "../lib/memories.ts";
import type { Memory, Profile } from "../lib/types.ts";

const NOW = new Date("2026-09-24T10:00:00");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
let n = 0;
const mem = (o: Partial<Memory> = {}): Memory => ({ id: `m${++n}`, created_by: "me", title: "moment", description: "", date: "2026-09-17", location: "", saved_item_id: null, photos: [], created_at: ago(7), ...o });
const profiles: Profile[] = [{ id: "me", name: "Shagun", avatar: "", photo: "" }, { id: "him", name: "Aarav", avatar: "", photo: "" }];

test("groups by month, newest month first, newest day first inside a month", () => {
  const a = mem({ date: "2026-09-17" }), b = mem({ date: "2026-09-02" }), c = mem({ date: "2026-08-30" }), d = mem({ date: "2025-12-31" });
  const g = groupByMonth([c, b, d, a]);
  assert.deepEqual(g.map((x) => x.label), ["september 2026", "august 2026", "december 2025"]);
  assert.deepEqual(g[0].memories.map((m) => m.id), [a.id, b.id]);
  assert.deepEqual(groupByMonth([]), []);
});

test("same-day memories: the one added last comes first", () => {
  const first = mem({ date: "2026-09-17", created_at: ago(5) }), second = mem({ date: "2026-09-17", created_at: ago(1) });
  assert.deepEqual(groupByMonth([first, second])[0].memories.map((m) => m.id), [second.id, first.id]);
});

test("dates are local, never shifted by a timezone", () => {
  assert.equal(longDate("2026-09-17"), "thursday, sep 17, 2026");
  assert.equal(longDate("2026-01-01"), "thursday, jan 1, 2026");
  assert.equal(longDate("2024-02-29"), "thursday, feb 29, 2024");
});

test("howLongAgo speaks like a person", () => {
  assert.equal(howLongAgo("2026-09-24", NOW), "today");
  assert.equal(howLongAgo("2026-09-23", NOW), "yesterday");
  assert.equal(howLongAgo("2026-09-17", NOW), "7 days ago");
  assert.equal(howLongAgo("2026-08-27", NOW), "4 weeks ago");
  assert.equal(howLongAgo("2026-03-24", NOW), "6 months ago");
  assert.equal(howLongAgo("2024-09-24", NOW), "2 years ago");
});

test("home: a brand-new memory wins; otherwise a stable older one; nothing if there's nothing", () => {
  assert.equal(homeMemory([], NOW), null);
  const fresh = mem({ created_at: ago(2) }), old = mem({ created_at: ago(90) });
  assert.deepEqual([homeMemory([old, fresh], NOW)!.memory.id, homeMemory([old, fresh], NOW)!.fresh], [fresh.id, true]);
  const olds = [mem({ created_at: ago(30) }), mem({ created_at: ago(60) }), mem({ created_at: ago(120) })];
  const one = homeMemory(olds, NOW)!, again = homeMemory(olds, NOW)!;
  assert.equal(one.fresh, false);
  assert.equal(one.memory.id, again.memory.id, "same calendar day → same 'remember this?' (no flicker)");
  assert.equal(homeMemory([mem({ created_at: ago(20) })], NOW)!.fresh, false);
});

test("feed announces new memories with the person's name, and only recent ones", () => {
  const mine = mem({ title: "coffee walk", created_at: ago(2) }), his = mem({ title: "movie night", created_by: "him", created_at: ago(1) }), ancient = mem({ title: "old", created_at: ago(90) });
  const text = activityFeed([], [], profiles, "me", NOW, 40, [mine, his, ancient]).map((e) => e.text);
  assert.ok(text.includes("You added a memory: “coffee walk”"));
  assert.ok(text.includes("Aarav added a memory: “movie night”"));
  assert.ok(!text.some((t) => t.includes("“old”")));
  assert.equal(activityFeed([], [], profiles, "me", NOW, 40, [mine])[0].href, `/memories/${mine.id}`);
});

test("hash-derived indexes are never negative or out of range (regression: signed >> on an unsigned hash → blank tiles)", async () => {
  const { hash } = await import("../lib/utils.ts");
  for (let i = 0; i < 5000; i++) {
    const h = hash(`memory-${i}-${crypto.randomUUID()}`);
    for (const idx of [(h >>> 5) % 8, (h >>> 3) % 13, h % 4]) assert.ok(Number.isInteger(idx) && idx >= 0, `bad index ${idx} for h=${h}`);
  }
  // and prove the bug this guards against was real
  const big = 0xfedcba98;
  assert.ok(((big >> 5) % 8) < 0, "signed shift really does go negative for large hashes");
  assert.ok(((big >>> 5) % 8) >= 0);
});

test("icons follow the object, not just the category (coffee spot → cup, not sushi)", async () => {
  const { iconFor } = await import("../lib/categories.ts");
  assert.equal(iconFor({ category: "eat", tags: ["coffee"] }), "places");
  assert.equal(iconFor({ category: "eat", tags: ["cafe", "brunch"] }), "places");
  assert.equal(iconFor({ category: "eat", tags: ["ramen"] }), "eat");
  assert.equal(iconFor({ category: "do", tags: [] }), "do");
});

test("swipe order is newest day first, then most recently added", () => {
  const a = mem({ date: "2026-09-17", created_at: ago(9) }), b = mem({ date: "2026-09-20", created_at: ago(20) }), c = mem({ date: "2026-09-17", created_at: ago(2) });
  assert.deepEqual(sortMemories([a, b, c]).map((m) => m.id), [b.id, c.id, a.id]);
  const input = [a, b]; sortMemories(input); assert.deepEqual(input.map((m) => m.id), [a.id, b.id], "does not mutate its input");
});

test("unnamed memories get a human title from their date", () => {
  assert.equal(autoTitle("2026-09-21"), "monday, sep 21");
  assert.equal(autoTitle("2026-01-01"), "thursday, jan 1");
});
