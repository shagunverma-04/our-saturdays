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
