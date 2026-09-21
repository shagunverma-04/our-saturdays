// Integration test: the app's real data layer (lib/remote.ts) against Postgres + PostgREST with RLS,
// as three different signed-in users. Run via supabase/tests/run-remote.sh.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import * as r from "../../lib/remote.ts";

const URL_ = process.env.REST_URL!;
const SECRET = process.env.JWT_SECRET!;
const ID = { alice: "00000000-0000-0000-0000-00000000000a", bob: "00000000-0000-0000-0000-00000000000b", carol: "00000000-0000-0000-0000-00000000000c", dave: "00000000-0000-0000-0000-00000000000d" };

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
function jwt(sub: string) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ sub, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 });
  return `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;
}
// supabase-js talks to <url>/rest/v1/…; PostgREST serves at the root — strip the prefix.
const as = (sub: string) =>
  createClient(URL_, "anon-key-unused", {
    accessToken: async () => jwt(sub),
    global: { fetch: (u, i) => fetch(String(u).replace("/rest/v1", ""), i) },
  });

const alice = as(ID.alice), bob = as(ID.bob), carol = as(ID.carol), dave = as(ID.dave);
let passed = 0;
const step = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`  ✓ ${name}`); };

const item = (o: Partial<import("../../lib/types.ts").SavedItem> = {}) => ({
  id: crypto.randomUUID(), created_by: ID.alice, title: "Ramen Tei", category: "eat" as const, description: "tiny place", image_url: "sb:x/y.jpg",
  source_url: "https://instagram.com/reel/1", location_name: "Koramangala", status: "saved" as const, release_date: "", notes: "", tags: ["ramen"],
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...o,
});

let coupleId = "", code = "";
await step("no couple yet → null", async () => assert.equal(await r.fetchMyCouple(alice, ID.alice), null));
await step("alice creates a space", async () => { code = await r.createCouple(alice, "A&B"); assert.match(code, /^[0-9a-f]{10}$/); });
await step("fetchMyCouple returns the embedded couple", async () => {
  const c = await r.fetchMyCouple(alice, ID.alice);
  assert.ok(c); assert.equal(c.name, "A&B"); assert.equal(c.inviteCode, code); coupleId = c.id;
});
await step("bob joins with the code; a third person is refused", async () => {
  await r.joinCouple(bob, code.toUpperCase());
  await assert.rejects(r.joinCouple(dave, code), /couple is full/);
  await assert.rejects(r.joinCouple(dave, "nonsense"), /invalid invite code/);
});

const ramen = item();
await step("alice inserts an item ('' date → NULL); bob reads it back mapped", async () => {
  await r.insertItem(alice, coupleId, ramen);
  const s = await r.fetchSpace(bob);
  const got = s.items.find((i) => i.id === ramen.id)!;
  assert.ok(got); assert.equal(got.created_by, ID.alice); assert.equal(got.release_date, ""); assert.deepEqual(got.tags, ["ramen"]); assert.equal(got.image_url, "sb:x/y.jpg");
});
await step("dated item round-trips", async () => {
  const movie = item({ title: "Movie", category: "watch", release_date: "2026-09-25" });
  await r.insertItem(alice, coupleId, movie);
  assert.equal((await r.fetchSpace(alice)).items.find((i) => i.id === movie.id)!.release_date, "2026-09-25");
  await r.patchItem(alice, movie.id, { release_date: "" });
  assert.equal((await r.fetchSpace(alice)).items.find((i) => i.id === movie.id)!.release_date, "");
});
await step("partner can edit what you saved (the bug the RLS tests caught)", async () => {
  await r.patchItem(bob, ramen.id, { status: "maybe", notes: "book ahead", tags: ["ramen", "date"] });
  const got = (await r.fetchSpace(alice)).items.find((i) => i.id === ramen.id)!;
  assert.equal(got.status, "maybe"); assert.equal(got.notes, "book ahead"); assert.equal(got.created_by, ID.alice);
});
await step("both profiles visible; own profile editable, partner's is not", async () => {
  assert.equal((await r.fetchSpace(alice)).profiles.length, 2);
  await r.patchProfile(alice, ID.alice, { name: "Shagun", avatar: "🧢", photo: "sb:c/avatars/a.jpg" });
  await r.patchProfile(bob, ID.alice, { name: "HACKED" }); // silently affects 0 rows under RLS
  const p = (await r.fetchSpace(bob)).profiles.find((x) => x.id === ID.alice)!;
  assert.deepEqual([p.name, p.avatar, p.photo], ["Shagun", "🧢", "sb:c/avatars/a.jpg"]);
  await r.patchProfile(alice, ID.alice, { photo: "" });
  assert.equal((await r.fetchSpace(bob)).profiles.find((x) => x.id === ID.alice)!.photo, "");
});

const date = "2026-09-26";
const kayak = item({ title: "Kayak", category: "do", tags: [] });
await step("planning: one plan per date; the bumped item returns to saved", async () => {
  await r.insertItem(bob, coupleId, { ...kayak, created_by: ID.bob });
  const plan = (id: string, title: string) => ({ id: crypto.randomUUID(), title, date, category: "eat" as const, saved_item_id: id, created_at: "" });
  await r.writePlan(alice, coupleId, plan(ramen.id, "Ramen"), []);
  let s = await r.fetchSpace(bob);
  assert.equal(s.plans.length, 1); assert.equal(s.items.find((i) => i.id === ramen.id)!.status, "planned");
  await r.writePlan(bob, coupleId, plan(kayak.id, "Kayak"), [ramen.id]);
  s = await r.fetchSpace(alice);
  assert.equal(s.plans.length, 1); assert.equal(s.plans[0].saved_item_id, kayak.id);
  assert.equal(s.items.find((i) => i.id === ramen.id)!.status, "saved"); assert.equal(s.items.find((i) => i.id === kayak.id)!.status, "planned");
});
await step("marking done takes it off the calendar", async () => {
  await r.setItemStatusOffCalendar(alice, kayak.id, "done");
  const s = await r.fetchSpace(alice);
  assert.equal(s.plans.length, 0); assert.equal(s.items.find((i) => i.id === kayak.id)!.status, "done");
});
await step("an outsider (carol, her own space) sees nothing of ours and can't touch it", async () => {
  await r.createCouple(carol, "C");
  const s = await r.fetchSpace(carol);
  assert.equal(s.items.length, 0); assert.equal(s.plans.length, 0); assert.equal(s.profiles.length, 1);
  await r.patchItem(carol, ramen.id, { title: "HACKED" });
  await r.deleteItem(carol, ramen.id);
  assert.equal((await r.fetchSpace(alice)).items.find((i) => i.id === ramen.id)!.title, "Ramen Tei");
  await assert.rejects(r.insertItem(carol, coupleId, item({ created_by: ID.carol })), /row-level security/);
});
const inter = (itemId: string, user: string, type: import("../../lib/types.ts").InteractionType) => ({ id: crypto.randomUUID(), saved_item_id: itemId, user_id: user, type, created_at: new Date().toISOString() });
await step("reactions: partner likes alice's find; both see it; a repeat tap is a database-level no-dupe", async () => {
  await r.insertInteraction(bob, coupleId, inter(ramen.id, ID.bob, "like"));
  await r.insertInteraction(alice, coupleId, inter(ramen.id, ID.alice, "saturday"));
  const s = await r.fetchSpace(alice);
  assert.equal(s.interactionsReady, true);
  assert.deepEqual(s.interactions.map((i) => `${i.user_id === ID.bob ? "bob" : "alice"}:${i.type}`).sort(), ["alice:saturday", "bob:like"]);
  assert.deepEqual((await r.fetchSpace(bob)).interactions.length, 2);
  await assert.rejects(r.insertInteraction(bob, coupleId, inter(ramen.id, ID.bob, "like")), /duplicate key/);
});
await step("reactions: you can only un-react as yourself", async () => {
  await r.deleteInteraction(alice, ramen.id, ID.bob, "like"); // tries to remove bob's like → affects 0 rows
  assert.equal((await r.fetchSpace(bob)).interactions.some((i) => i.type === "like"), true);
  await r.deleteInteraction(bob, ramen.id, ID.bob, "like");
  assert.equal((await r.fetchSpace(bob)).interactions.some((i) => i.type === "like"), false);
});
await step("reactions: outsider sees none and can't react to our item", async () => {
  assert.equal((await r.fetchSpace(carol)).interactions.length, 0);
  await assert.rejects(r.insertInteraction(carol, coupleId, inter(ramen.id, ID.carol, "like")), /row-level security/);
});
await step("reactions: deleting an item takes its reactions with it", async () => {
  const tmp = item({ title: "temp" });
  await r.insertItem(alice, coupleId, tmp);
  await r.insertInteraction(bob, coupleId, inter(tmp.id, ID.bob, "like"));
  await r.deleteItem(alice, tmp.id);
  assert.equal((await r.fetchSpace(alice)).interactions.some((i) => i.saved_item_id === tmp.id), false);
});
const mem = (o: Partial<import("../../lib/types.ts").Memory> = {}) => ({ id: crypto.randomUUID(), created_by: ID.alice, title: "that random tuesday", description: "coffee, then a 3 hour walk", date: "2026-09-17", location: "Indiranagar", saved_item_id: null as string | null, photos: ["sb:c/a.jpg", "sb:c/b.jpg"], created_at: new Date().toISOString(), ...o });
const memo = mem({ saved_item_id: ramen.id });
await step("memories: alice saves one with photos, linked to a find; bob reads it with photos in order", async () => {
  await r.insertMemory(alice, coupleId, memo);
  const got = (await r.fetchSpace(bob)).memories.find((m) => m.id === memo.id)!;
  assert.ok(got); assert.deepEqual(got.photos, ["sb:c/a.jpg", "sb:c/b.jpg"]); assert.equal(got.date, "2026-09-17"); assert.equal(got.saved_item_id, ramen.id); assert.equal(got.created_by, ID.alice);
});
await step("memories: partner edits words, removes one photo, adds another, and reorders", async () => {
  await r.patchMemory(bob, memo.id, { description: "best broth ever", photos: ["sb:c/c.jpg", "sb:c/b.jpg"] }, memo.photos);
  const got = (await r.fetchSpace(alice)).memories.find((m) => m.id === memo.id)!;
  assert.equal(got.description, "best broth ever"); assert.deepEqual(got.photos, ["sb:c/c.jpg", "sb:c/b.jpg"]); assert.equal(got.created_by, ID.alice);
  await r.patchMemory(alice, memo.id, { photos: ["sb:c/b.jpg", "sb:c/c.jpg"] }, got.photos);   // swap order only
  assert.deepEqual((await r.fetchSpace(bob)).memories.find((m) => m.id === memo.id)!.photos, ["sb:c/b.jpg", "sb:c/c.jpg"]);
});
await step("memories: no photos is fine; newest memory date sorts first", async () => {
  const later = mem({ title: "later one", date: "2026-09-20", photos: [] });
  await r.insertMemory(bob, coupleId, { ...later, created_by: ID.bob });
  const list = (await r.fetchSpace(alice)).memories;
  assert.equal(list[0].id, later.id); assert.deepEqual(list[0].photos, []);
});
await step("memories: outsider sees none, can't edit, delete, or link to our find", async () => {
  assert.equal((await r.fetchSpace(carol)).memories.length, 0);
  await r.patchMemory(carol, memo.id, { title: "HACKED" }, []);
  await r.deleteMemory(carol, memo.id);
  assert.equal((await r.fetchSpace(alice)).memories.find((m) => m.id === memo.id)!.title, "that random tuesday");
  const c = (await r.fetchMyCouple(carol, ID.carol))!;
  await assert.rejects(r.insertMemory(carol, c.id, mem({ created_by: ID.carol, saved_item_id: ramen.id, photos: [] })), /row-level security/);
});
await step("memories: deleting removes its photos; deleting the find only unlinks", async () => {
  const other = item({ title: "linked" });
  await r.insertItem(alice, coupleId, other);
  const m2 = mem({ saved_item_id: other.id, photos: ["sb:c/z.jpg"] });
  await r.insertMemory(alice, coupleId, m2);
  await r.deleteItem(alice, other.id);
  assert.equal((await r.fetchSpace(alice)).memories.find((m) => m.id === m2.id)!.saved_item_id, null);
  await r.deleteMemory(bob, m2.id);
  assert.equal((await r.fetchSpace(alice)).memories.some((m) => m.id === m2.id), false);
});
const draw = (o: Partial<import("../../lib/types.ts").Drawing> = {}) => ({ id: crypto.randomUUID(), created_by: ID.alice, image: "sb:c/drawings/1.png", caption: "for you", seen_by: [] as string[], created_at: new Date().toISOString(), ...o });
await step("drawings: alice sends one; bob sees it, marks it seen, can't repaint it; only she can delete it", async () => {
  const d = draw();
  await r.insertDrawing(alice, coupleId, d);
  let got = (await r.fetchSpace(bob)).drawings.find((x) => x.id === d.id)!;
  assert.ok(got); assert.deepEqual([got.image, got.caption, got.seen_by], ["sb:c/drawings/1.png", "for you", []]);
  await r.markDrawingSeen(bob, d.id, [ID.bob]);
  got = (await r.fetchSpace(alice)).drawings.find((x) => x.id === d.id)!;
  assert.deepEqual(got.seen_by, [ID.bob]);
  await r.deleteDrawing(bob, d.id);                                            // not the artist → 0 rows
  assert.equal((await r.fetchSpace(alice)).drawings.some((x) => x.id === d.id), true);
  assert.equal((await r.fetchSpace(carol)).drawings.length, 0);
  await r.deleteDrawing(alice, d.id);
  assert.equal((await r.fetchSpace(bob)).drawings.some((x) => x.id === d.id), false);
});

const tid = crypto.randomUUID();
const trip = { id: tid, title: "Goa", destination: "Goa", start_date: "2026-10-24", end_date: "2026-10-27", notes: "", budget_estimate: 12000, created_at: "", items: [], expenses: [] };
await step("trips: create, read back with dates and budget; partner edits it", async () => {
  await r.insertTrip(alice, coupleId, trip);
  let got = (await r.fetchSpace(bob)).trips.find((t) => t.id === tid)!;
  assert.deepEqual([got.title, got.start_date, got.end_date, got.budget_estimate, got.items.length], ["Goa", "2026-10-24", "2026-10-27", 12000, 0]);
  await r.patchTrip(bob, tid, { budget_estimate: 15000, notes: "book the hotel", end_date: "" });
  got = (await r.fetchSpace(alice)).trips.find((t) => t.id === tid)!;
  assert.deepEqual([got.budget_estimate, got.notes, got.end_date], [15000, "book the hotel", ""]);
  await r.patchTrip(alice, tid, { budget_estimate: null, end_date: "2026-10-27" });
  assert.equal((await r.fetchSpace(alice)).trips.find((t) => t.id === tid)!.budget_estimate, null);
});
await step("trips: itinerary items (with/without a time), schedule one, unschedule it", async () => {
  const a = { id: crypto.randomUUID(), trip_id: tid, saved_item_id: null, item_type: "food" as const, title: "Fish thali", location: "Panjim", scheduled_date: "2026-10-25", scheduled_time: "13:30", notes: "" };
  const b = { ...a, id: crypto.randomUUID(), item_type: "place" as const, title: "Fort Aguada", location: "", scheduled_date: "", scheduled_time: "" };
  await r.insertTripItem(alice, a); await r.insertTripItem(bob, b);
  let t = (await r.fetchSpace(alice)).trips.find((x) => x.id === tid)!;
  const ga = t.items.find((i) => i.id === a.id)!, gb = t.items.find((i) => i.id === b.id)!;
  assert.deepEqual([ga.scheduled_date, ga.scheduled_time, ga.location, ga.item_type], ["2026-10-25", "13:30", "Panjim", "food"], "HH:MM (not HH:MM:SS)");
  assert.deepEqual([gb.scheduled_date, gb.scheduled_time], ["", ""]);
  await r.patchTripItem(alice, b.id, { scheduled_date: "2026-10-26", scheduled_time: "16:00" });
  await r.patchTripItem(bob, a.id, { scheduled_date: "", scheduled_time: "" });
  t = (await r.fetchSpace(bob)).trips.find((x) => x.id === tid)!;
  assert.deepEqual(t.items.find((i) => i.id === b.id)!.scheduled_time, "16:00");
  assert.deepEqual(t.items.find((i) => i.id === a.id)!.scheduled_date, "");
  await r.deleteTripItem(alice, b.id);
  assert.equal((await r.fetchSpace(alice)).trips.find((x) => x.id === tid)!.items.length, 1);
});
await step("trips: expenses add up exactly; outsider sees and changes nothing", async () => {
  await r.insertExpense(alice, { id: crypto.randomUUID(), trip_id: tid, category: "food", amount: 450.5, description: "thali", paid_by: ID.alice, created_at: "" });
  const e2 = { id: crypto.randomUUID(), trip_id: tid, category: "stay" as const, amount: 3000, description: "night 1", paid_by: null, created_at: "" };
  await r.insertExpense(bob, e2);
  const t = (await r.fetchSpace(alice)).trips.find((x) => x.id === tid)!;
  assert.equal(t.expenses.reduce((s, e) => s + e.amount, 0), 3450.5);
  assert.equal(typeof t.expenses[0].amount, "number", "numeric column comes back as a number");
  const c = (await r.fetchSpace(carol));
  assert.equal(c.trips.length, 0);
  await r.deleteExpense(carol, e2.id); await r.patchTrip(carol, tid, { title: "HACKED" }); await r.deleteTrip(carol, tid);
  const still = (await r.fetchSpace(alice)).trips.find((x) => x.id === tid)!;
  assert.deepEqual([still.title, still.expenses.length], ["Goa", 2]);
  await assert.rejects(r.insertTripItem(carol, { id: crypto.randomUUID(), trip_id: tid, saved_item_id: null, item_type: "place", title: "evil", location: "", scheduled_date: "", scheduled_time: "", notes: "" }), /row-level security/);
});
await step("trips: a memory can be tagged to a trip, and survives the trip being deleted", async () => {
  const m = { id: crypto.randomUUID(), created_by: ID.alice, title: "beach day", description: "", date: "2026-10-25", location: "Baga", saved_item_id: null, trip_id: tid, photos: [] as string[], created_at: new Date().toISOString() };
  await r.insertMemory(alice, coupleId, m);
  assert.equal((await r.fetchSpace(bob)).memories.find((x) => x.id === m.id)!.trip_id, tid);
  await r.patchMemory(bob, m.id, { trip_id: null }, []);
  assert.equal((await r.fetchSpace(alice)).memories.find((x) => x.id === m.id)!.trip_id, null);
  await r.patchMemory(bob, m.id, { trip_id: tid }, []);
  await r.deleteTrip(alice, tid);
  const after = await r.fetchSpace(alice);
  assert.equal(after.trips.some((t) => t.id === tid), false);
  assert.equal(after.memories.find((x) => x.id === m.id)!.trip_id, null, "memory kept, just untagged");
  assert.equal(after.memories.some((x) => x.id === m.id), true);
});

await step("plans: an optional time round-trips as HH:MM", async () => {
  const plan = { id: crypto.randomUUID(), title: "Pottery", date: "2026-09-26", category: "do" as const, saved_item_id: ramen.id, time: "18:00", created_at: "" };
  await r.writePlan(alice, coupleId, plan, []);
  let got = (await r.fetchSpace(bob)).plans.find((p) => p.id === plan.id)!;
  assert.equal(got.time, "18:00");
  await r.setPlanTime(bob, plan.id, null);
  got = (await r.fetchSpace(alice)).plans.find((p) => p.id === plan.id)!;
  assert.equal(got.time, null);
  await r.setPlanTime(alice, plan.id, "09:30");
  assert.equal((await r.fetchSpace(bob)).plans.find((p) => p.id === plan.id)!.time, "09:30");
  await r.setItemStatusOffCalendar(alice, ramen.id, "saved");
});

await step("games: guess-the-word history; who-saved is one shared row however many times it's created", async () => {
  const g = { id: crypto.randomUUID(), type: "guess_word" as const, created_by: ID.alice, prompt: "what is it?", answer: "pottery", hint: "we keep saying we should", created_at: "", attempts: [] };
  await r.insertGame(alice, coupleId, g);
  const at = (correct: boolean, guess: string) => ({ id: crypto.randomUUID(), game_id: g.id, user_id: ID.bob, guess, correct, created_at: "" });
  await r.insertAttempt(bob, at(false, "ramen")); await r.insertAttempt(bob, at(true, "pottery"));
  const got = (await r.fetchSpace(alice)).games.find((x) => x.id === g.id)!;
  assert.deepEqual([got.answer, got.hint, got.attempts.length, got.attempts.filter((a) => a.correct).length], ["pottery", "we keep saying we should", 2, 1]);
  const w1 = { ...g, id: crypto.randomUUID(), type: "who_saved" as const, prompt: ramen.id, answer: ID.alice, hint: "" };
  await r.insertGame(alice, coupleId, w1);
  await r.insertGame(bob, coupleId, { ...w1, id: crypto.randomUUID(), created_by: ID.bob });             // same subject again: quietly ignored, not an error
  assert.equal((await r.fetchSpace(alice)).games.filter((x) => x.type === "who_saved" && x.prompt === ramen.id).length, 1);
  await r.insertAttempt(bob, { id: crypto.randomUUID(), game_id: w1.id, user_id: ID.bob, guess: ID.alice, correct: true, created_at: "" });
  assert.equal((await r.fetchSpace(alice)).games.find((x) => x.id === w1.id)!.attempts.length, 1);
  assert.equal((await r.fetchSpace(carol)).games.length, 0);
  await assert.rejects(r.insertAttempt(carol, at(true, "pottery")), /row-level security|violates/);
  await r.deleteGame(alice, g.id);
  assert.equal((await r.fetchSpace(bob)).games.some((x) => x.id === g.id), false);
});

await step("calendar link: saved for you, invisible to your partner, clearable", async () => {
  assert.equal(await r.getCalendarLink(alice, ID.alice), "");
  await r.setCalendarLink(alice, ID.alice, "https://calendar.google.com/calendar/ical/x/basic.ics");
  assert.equal(await r.getCalendarLink(alice, ID.alice), "https://calendar.google.com/calendar/ical/x/basic.ics");
  assert.equal(await r.getCalendarLink(bob, ID.alice), "", "your partner can't read your private calendar address");
  await r.setCalendarLink(alice, ID.alice, "https://example.com/new.ics");
  assert.equal(await r.getCalendarLink(alice, ID.alice), "https://example.com/new.ics", "updating replaces, not duplicates");
  await assert.rejects(r.setCalendarLink(bob, ID.bob, "ftp://nope"), /check|violates/);
  await r.setCalendarLink(alice, ID.alice, "");
  assert.equal(await r.getCalendarLink(alice, ID.alice), "");
});
await step("delete removes the item and its plans", async () => {
  await r.writePlan(alice, coupleId, { id: crypto.randomUUID(), title: "Ramen", date, category: "eat", saved_item_id: ramen.id, created_at: "" }, []);
  await r.deleteItem(bob, ramen.id);
  const s = await r.fetchSpace(alice);
  assert.equal(s.items.some((i) => i.id === ramen.id), false); assert.equal(s.plans.length, 0);
});
await step("row mapping drops server-owned columns", async () => {
  assert.deepEqual(Object.keys(r.itemToRow({ id: "x", created_by: "y", created_at: "z", updated_at: "w", title: "t", release_date: "" })).sort(), ["release_date", "title"]);
  assert.equal(r.itemToRow({ release_date: "" }).release_date, null);
});

console.log(`\nALL ${passed} REMOTE INTEGRATION STEPS PASSED`);
