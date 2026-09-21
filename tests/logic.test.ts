import assert from "node:assert/strict";
import test from "node:test";
import { activityFeed } from "../lib/activity.ts";
import { insights, lately } from "../lib/insights.ts";
import { conversation, inView, pickPool, saturdayCandidates, signalsFor, weightedPick } from "../lib/shared.ts";
import type { Interaction, InteractionType, Profile, SavedItem } from "../lib/types.ts";

const NOW = new Date("2026-09-24T10:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const ME = "me", HIM = "him";
const profiles: Profile[] = [{ id: ME, name: "Shagun", avatar: "", photo: "" }, { id: HIM, name: "Aarav", avatar: "", photo: "" }];
let n = 0;
const item = (o: Partial<SavedItem> = {}): SavedItem => ({ id: `i${++n}`, created_by: ME, title: "Clay Station", category: "do", description: "", image_url: "", source_url: "", location_name: "", status: "saved", release_date: "", notes: "", tags: [], created_at: ago(3), updated_at: ago(3), ...o });
const react = (it: SavedItem, user: string, type: InteractionType, d = 1): Interaction => ({ id: `r${++n}`, saved_item_id: it.id, user_id: user, type, created_at: ago(d) });
const names = { meId: ME, partner: "Aarav" };

test("a find alone is not mutual; the creator's interest is implicit", () => {
  const a = item();
  const s = signalsFor(a, [], ME);
  assert.equal(s.mutual, false);
  assert.equal(conversation(a, s, names), "waiting for Aarav's take 👀");
});

test("partner reacts ❤️ → 'you both like this', for either viewer, and the item is not copied", () => {
  const a = item();
  const r = [react(a, HIM, "like")];
  assert.equal(signalsFor(a, r, ME).mutual, true);
  assert.equal(conversation(a, signalsFor(a, r, ME), names), "you both like this ❤️");
  assert.equal(signalsFor(a, r, HIM).mutual, true); // same object, seen from his side
});

test("👀 alone reads as curiosity, not 'like'", () => {
  const a = item();
  assert.equal(conversation(a, signalsFor(a, [react(a, HIM, "interested")], ME), names), "you're both curious 👀");
});

test("reacting to someone else's find makes it mutual (their save is their interest)", () => {
  const a = item({ created_by: HIM });
  assert.equal(signalsFor(a, [], ME).mutual, false);
  assert.equal(conversation(a, signalsFor(a, [], ME), names), "Aarav found this — what do you think?");
  assert.equal(signalsFor(a, [react(a, ME, "like")], ME).mutual, true);
});

test("Saturday: one person → 'wants to do this Saturday', both → 'Saturday plan?'", () => {
  const a = item();
  assert.equal(conversation(a, signalsFor(a, [react(a, HIM, "saturday")], ME), names), "Aarav wants to do this Saturday 👀");
  assert.equal(conversation(a, signalsFor(a, [react(a, ME, "saturday")], ME), names), "you asked about Saturday — waiting on Aarav 👀");
  assert.equal(conversation(a, signalsFor(a, [react(a, ME, "saturday"), react(a, HIM, "saturday")], ME), names), "Saturday plan? ✨");
});

test("'not for us' from either person removes it from mutual", () => {
  const a = item();
  const s = signalsFor(a, [react(a, HIM, "like"), react(a, ME, "dismissed")], ME);
  assert.equal(s.mutual, false);
  assert.equal(s.dismissed, true);
});

test("three views: mine / theirs / our list — and done leaves them", () => {
  const mine = item(), theirs = item({ created_by: HIM }), both = item();
  const r = [react(both, HIM, "like")];
  const v = (it: SavedItem, view: "our" | "mine" | "theirs") => inView(it, signalsFor(it, r, ME), view, ME);
  assert.deepEqual([v(mine, "mine"), v(mine, "our"), v(theirs, "theirs"), v(theirs, "mine"), v(both, "our"), v(both, "mine")], [true, false, true, false, true, true]);
  const done = item({ status: "done" });
  assert.equal(v(done, "mine"), false);
});

test("no pronouns are ever assumed", () => {
  const a = item(), b = item({ created_by: HIM });
  const all = [conversation(a, signalsFor(a, [], ME), names), conversation(b, signalsFor(b, [], ME), names), conversation(a, signalsFor(a, [react(a, HIM, "saturday")], ME), names)];
  for (const line of all) assert.doesNotMatch(line, /\b(he|she|him|her|his|hers)\b/i);
  // partner hasn't joined yet
  assert.doesNotMatch(conversation(a, signalsFor(a, [], ME), { meId: ME, partner: "" }), /\b(he|she)\b/i);
});

test("Saturday candidates rank both-Saturday > one > mutual > fresh; skip done/dismissed/planned", () => {
  const both = item({ title: "both" }), one = item({ title: "one" }), mut = item({ title: "mutual" }), fresh = item({ title: "fresh", created_at: ago(2) });
  const old = item({ title: "old", created_at: ago(60) }), done = item({ title: "done", status: "done" }), dis = item({ title: "dis" }), planned = item({ title: "planned" });
  const r = [react(both, ME, "saturday"), react(both, HIM, "saturday"), react(one, HIM, "saturday"), react(mut, HIM, "like"), react(dis, HIM, "dismissed"), react(planned, HIM, "like")];
  const c = saturdayCandidates([old, fresh, mut, one, both, done, dis, planned], r, ME, new Set([planned.id]), NOW);
  assert.deepEqual(c.map((x) => x.item.title), ["both", "one", "mutual", "fresh"]);
});

test("pick pool prefers shared interest; falls back (and says so) when there is none", () => {
  const a = item(), b = item();
  assert.deepEqual(pickPool([a, b], [], ME, new Set()).shared, false);
  const r = [react(a, HIM, "like")];
  const p = pickPool([a, b], r, ME, new Set());
  assert.equal(p.shared, true);
  assert.deepEqual(p.pool.map((x) => x.id), [a.id]);
});

test("picker never repeats what was just shown (when there's another choice) and honours weights", () => {
  const a = item(), b = item(), c = item();
  const r = [react(a, HIM, "like")];
  for (let k = 0; k < 50; k++) assert.notEqual(weightedPick([a, b, c], r, ME, [a.id, b.id], Math.random, NOW)!.id, a.id === b.id ? "" : c.id === "x" ? "" : a.id);
  assert.equal(weightedPick([a, b, c], r, ME, [a.id, b.id], () => 0, NOW)!.id, c.id);
  assert.equal(weightedPick([a], [], ME, [a.id], Math.random, NOW)!.id, a.id); // only choice
  // the mutual item is weighted heavier
  const wins = { a: 0, other: 0 };
  let seed = 1; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 2000; k++) {
    if (weightedPick([a, b], r, ME, [], rand, NOW)!.id === a.id) wins.a++;
    else wins.other++;
  }
  assert.ok(wins.a > wins.other * 1.5, `mutual item should win more often: ${JSON.stringify(wins)}`);
});

test("insights stay silent without enough data", () => {
  assert.deepEqual(insights([], [], NOW), []);
  assert.deepEqual(insights([item(), item(), item({ category: "watch" })], [], NOW), []);
  assert.equal(lately([item(), item()], NOW), "");
});

test("insights report only true counts", () => {
  const movies = Array.from({ length: 8 }, (_, i) => item({ category: "watch", status: i < 2 ? "done" : "saved" }));
  assert.ok(insights(movies, [], NOW).includes("you've saved 8 movies but watched 2 😭"));
  const acts = Array.from({ length: 4 }, () => item({ category: "do" }));
  assert.ok(insights(acts, [], NOW).includes("you haven't tried any of your saved activities yet."));
  assert.ok(insights([...acts, item({ category: "do", status: "done" })], [], NOW).every((s) => !s.includes("haven't tried")));
  assert.ok(insights([], acts, NOW).includes("you have 4 activities you've both liked."));
  const cafes = [item({ tags: ["coffee"], created_by: ME }), item({ tags: ["cafe"], created_by: HIM }), item({ tags: ["coffee"], created_by: ME })];
  assert.ok(insights(cafes, [], NOW).includes("you both keep saving cafés."));
  assert.ok(!insights([item({ tags: ["coffee"] }), item({ tags: ["coffee"] }), item({ tags: ["coffee"] })], [], NOW).includes("you both keep saving cafés."), "one person saving cafés is not 'you both'");
  assert.equal(lately([item(), item(), item({ created_at: ago(20) })], NOW), "");
  assert.equal(lately([item(), item(), item()], NOW), "you two have saved 3 things this week.");
  const visited = [item({ category: "eat", status: "done", updated_at: ago(2) }), item({ category: "places", status: "done", updated_at: ago(5) }), item({ category: "eat", status: "done", updated_at: ago(90) })];
  assert.ok(insights(visited, [], NOW).includes("you visited 2 new places this month."));
});

test("activity feed: saved / liked / mutual / done — named, deduped, recent only", () => {
  const cafe = item({ title: "Roastery", category: "eat", tags: ["coffee"], created_by: HIM, created_at: ago(2) });
  const clay = item({ title: "Clay Station", created_by: ME, created_at: ago(6) });
  const old = item({ title: "Ancient", created_at: ago(90) });
  const finished = item({ title: "Ramen", status: "done", updated_at: ago(1) });
  const r = [react(clay, HIM, "like", 4), react(cafe, ME, "saturday", 1)];
  const feed = activityFeed([cafe, clay, old, finished], r, profiles, ME, NOW);
  const text = feed.map((e) => e.text);
  assert.ok(text.includes("Aarav saved a new café"));
  assert.ok(text.includes("You both liked “Clay Station”"));
  assert.ok(text.includes("You suggested Saturday for “Roastery”"));
  assert.ok(text.includes("You did “Ramen”"));
  assert.ok(!text.some((t) => t.includes("Ancient")), "events older than 30 days are dropped");
  assert.ok(!text.some((t) => /liked your “Clay Station” find/.test(t)), "the like that made it mutual is told once, as 'you both liked'");
  assert.deepEqual([...feed].map((e) => e.at), [...feed].map((e) => e.at).sort().reverse());
  for (const t of text) assert.doesNotMatch(t, /\b(he|she|him|her|his)\b/i);
});

test("a plain like on a non-mutual moment is reported with names", () => {
  const a = item({ title: "Pottery", created_at: ago(9) });
  const first = react(a, HIM, "interested", 5), second = react(a, HIM, "like", 2);
  const feed = activityFeed([a], [first, second], profiles, ME, NOW).map((e) => e.text);
  assert.ok(feed.includes("Aarav liked your “Pottery” find"));
});
