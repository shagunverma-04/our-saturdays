import assert from "node:assert/strict";
import test from "node:test";
import { activityFeed, tripGrouping } from "../lib/activity.ts";
import type { Drawing, Game, Profile, SavedItem, Trip } from "../lib/types.ts";

const NOW = new Date("2026-09-24T10:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const profiles: Profile[] = [{ id: "me", name: "Shagun", avatar: "", photo: "" }, { id: "him", name: "Aarav", avatar: "", photo: "" }];
let n = 0;
const item = (o: Partial<SavedItem> = {}): SavedItem => ({ id: `i${++n}`, created_by: "me", title: "t", category: "eat", description: "", image_url: "", source_url: "", location_name: "", status: "saved", release_date: "", notes: "", tags: [], created_at: ago(3), updated_at: ago(3), ...o });
const trip = (o: Partial<Trip> = {}): Trip => ({ id: "t1", title: "Goa trip", destination: "Goa", start_date: "", end_date: "", notes: "", budget_estimate: null, created_at: ago(20), items: [], expenses: [], ...o });
const text = (extras: Parameters<typeof activityFeed>[7], items: SavedItem[] = []) => activityFeed(items, [], profiles, "me", NOW, 40, [], extras).map((e) => e.text);

test("'you both saved 3 things for Goa' needs 3 finds, from BOTH of you, in the last 30 days", () => {
  const goa = (by: string, o: Partial<SavedItem> = {}) => item({ created_by: by, location_name: "Panjim, Goa", ...o });
  const three = [goa("me"), goa("him"), goa("me", { title: "Goa hotel", location_name: "" })];
  assert.equal(tripGrouping(trip(), three, NOW)!.count, 3);
  assert.ok(text({ trips: [trip()] }, three).includes("You both saved 3 things for Goa"));
  assert.equal(tripGrouping(trip(), [goa("me"), goa("him")], NOW), null, "two is not a group");
  assert.equal(tripGrouping(trip(), [goa("me"), goa("me"), goa("me")], NOW), null, "all by one person is not 'you both'");
  assert.equal(tripGrouping(trip(), [goa("me"), goa("him"), goa("him", { created_at: ago(45) })], NOW), null, "old finds don't count");
  assert.equal(tripGrouping(trip({ destination: "" }), three, NOW), null, "no destination, no guessing");
  const linked = [item({ created_by: "me" }), item({ created_by: "him" }), item({ created_by: "me" })];
  const t = trip({ destination: "Coorg", items: linked.map((l) => ({ id: `ti-${l.id}`, trip_id: "t1", saved_item_id: l.id, item_type: "place", title: "", location: "", scheduled_date: "", scheduled_time: "", notes: "" })) });
  assert.equal(tripGrouping(t, linked, NOW)!.count, 3, "finds placed in the trip count even if they never mention its name");
  assert.ok(text({ trips: [trip({ destination: "", title: "x" })] }, three).every((x) => !x.includes("both saved")));
});

test("drawings appear with the artist's name", () => {
  const d = (by: string, id: string): Drawing => ({ id, created_by: by, image: "x", caption: "", seen_by: [], created_at: ago(1) });
  const t = text({ drawings: [d("him", "d1"), d("me", "d2"), { ...d("him", "d3"), created_at: ago(90) }] });
  assert.ok(t.includes("Aarav drew something for you"));
  assert.ok(t.includes("You sent a drawing"));
  assert.equal(t.filter((x) => x.includes("drew")).length, 1, "a 90-day-old drawing is not news");
  assert.equal(activityFeed([], [], profiles, "me", NOW, 40, [], { drawings: [d("him", "d1")] })[0].href, "/draw?open=d1");
});

test("word games: a solved one is celebrated, an unanswered one from your partner is a nudge; your own waiting one is silent", () => {
  const g = (o: Partial<Game>): Game => ({ id: `g${++n}`, type: "guess_word", created_by: "him", prompt: "p", answer: "a", hint: "", created_at: ago(2), attempts: [], ...o });
  const solvedByMe = g({ attempts: [{ id: "a1", game_id: "x", user_id: "me", guess: "a", correct: true, created_at: ago(1) }] });
  const solvedByHim = g({ created_by: "me", attempts: [{ id: "a2", game_id: "x", user_id: "him", guess: "a", correct: true, created_at: ago(1) }] });
  const waitingForMe = g({});
  const waitingForHim = g({ created_by: "me" });
  const whoSaved = g({ type: "who_saved", attempts: [{ id: "a3", game_id: "x", user_id: "me", guess: "him", correct: true, created_at: ago(1) }] });
  const t = text({ games: [solvedByMe, solvedByHim, waitingForMe, waitingForHim, whoSaved] });
  assert.ok(t.includes("You guessed Aarav's word"));
  assert.ok(t.includes("Aarav guessed your word"));
  assert.ok(t.includes("Aarav left you a word to guess"));
  assert.equal(t.filter((x) => x.includes("word")).length, 3, "your own unanswered game says nothing; who-saved plays aren't feed events");
});

test("no pronouns in any of the new lines", () => {
  const all = text({ drawings: [{ id: "d", created_by: "him", image: "", caption: "", seen_by: [], created_at: ago(1) }], games: [{ id: "g", type: "guess_word", created_by: "him", prompt: "", answer: "", hint: "", created_at: ago(1), attempts: [] }] });
  for (const line of all) assert.doesNotMatch(line, /\b(he|she|him|her|his)\b/i, line);
});
