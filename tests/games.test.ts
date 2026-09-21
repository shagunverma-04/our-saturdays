import assert from "node:assert/strict";
import test from "node:test";
import { buildRememberQuestion, guessState, isCorrectGuess, monthLabel, normalizeGuess, pickRememberMemory, pickWhoSaved, scoreFor } from "../lib/games.ts";
import type { Game, GameAttempt, Memory, SavedItem } from "../lib/types.ts";

const NOW = new Date("2026-09-24T10:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
let n = 0;
const item = (o: Partial<SavedItem> = {}): SavedItem => ({ id: `i${++n}`, created_by: "me", title: "t", category: "eat", description: "", image_url: "", source_url: "", location_name: "", status: "saved", release_date: "", notes: "", tags: [], created_at: ago(30), updated_at: ago(30), ...o });
const mem = (o: Partial<Memory> = {}): Memory => ({ id: `m${++n}`, created_by: "me", title: "moment", description: "", date: "2026-08-15", location: "", saved_item_id: null, photos: [], created_at: ago(30), ...o });
const att = (game_id: string, user_id: string, correct: boolean, guess = "x", at = 0): GameAttempt => ({ id: `a${++n}`, game_id, user_id, guess, correct, created_at: ago(10 - at) });
const game = (o: Partial<Game> = {}): Game => ({ id: `g${++n}`, type: "guess_word", created_by: "me", prompt: "", answer: "", hint: "", created_at: ago(20), attempts: [], ...o });

test("guesses forgive case, accents, punctuation and spacing — but not different words", () => {
  for (const g of ["Pottery", "  pottery ", "POTTERY!", "p-o-t-t-e-r-y".replace(/-/g, ""), "Pottéry"]) assert.equal(isCorrectGuess(g, "pottery"), true, g);
  assert.equal(isCorrectGuess("The  Ramen-Place", "the ramen place"), true);
  assert.equal(isCorrectGuess("café", "Cafe"), true);
  assert.equal(isCorrectGuess("pottery class", "pottery"), false);
  assert.equal(isCorrectGuess("", ""), false, "an empty answer is never 'correct'");
  assert.equal(isCorrectGuess("   ", "pottery"), false);
  assert.equal(normalizeGuess("Dosa & Chai — 2!"), "dosa chai 2");
  assert.equal(isCorrectGuess("कॉफ़ी", "कॉफ़ी"), true, "non-latin scripts work");
});

test("guess-the-word state: multiple guesses, solved, who solved", () => {
  const g = game({ id: "g1" });
  assert.deepEqual(guessState(g), { solved: false, tries: 0, wrong: [], solvedBy: null, lastAt: null });
  g.attempts = [att("g1", "him", false, "ramen", 1), att("g1", "him", false, "sushi", 2), att("g1", "him", true, "pottery", 3)];
  const s = guessState(g);
  assert.deepEqual([s.solved, s.tries, s.wrong.length, s.solvedBy], [true, 3, 2, "him"]);
  assert.equal(s.lastAt, ago(7));
});

test("who-saved picks an unplayed find at least 3 days old, older first, never one you already played", () => {
  const old = item({ created_at: ago(60) }), mid = item({ created_at: ago(20) }), fresh = item({ created_at: ago(1) }), played = item({ created_at: ago(90) }), archived = item({ status: "archived", created_at: ago(80) });
  const games = [game({ type: "who_saved", prompt: played.id, attempts: [att("x", "me", true)] })];
  const got = new Set<string>();
  for (let k = 0; k < 40; k++) got.add(pickWhoSaved([old, mid, fresh, played, archived], games, "me", () => k / 40, NOW)!.id);
  assert.ok(!got.has(fresh.id) && !got.has(played.id) && !got.has(archived.id));
  assert.ok(got.has(old.id), "prefers the older half");
  assert.equal(pickWhoSaved([fresh], [], "me", Math.random, NOW), null, "nothing old enough → no question");
  const theirs = [game({ type: "who_saved", prompt: old.id, attempts: [att("x", "him", true)] })];
  assert.equal(pickWhoSaved([old], theirs, "me", Math.random, NOW)!.id, old.id, "his play doesn't stop YOU playing it");
});

test("remember-when: always a real question with a wrong answer to pick", () => {
  const places = ["Lalbagh", "Toit", "Coorg", "Goa"];
  const all = places.map((location, i) => mem({ location, date: `2026-0${i + 2}-10` }));
  let where = 0, month = 0;
  for (let k = 0; k < 60; k++) {
    const m = all[k % 4];
    const q = buildRememberQuestion(m, all, () => (k * 0.137) % 1);
    assert.ok(q.choices.includes(q.answer), "answer is among the choices");
    assert.equal(new Set(q.choices).size, q.choices.length, "no duplicate choices");
    assert.equal(q.choices.length, 4);
    if (q.kind === "where") { where++; assert.equal(q.answer, m.location); assert.ok(q.choices.every((c) => c === m.location || places.includes(c))); }
    else { month++; assert.equal(q.answer, m.date.slice(0, 7)); }
  }
  assert.ok(where > 0 && month > 0, "both kinds occur");
  const few = [mem({ location: "Lalbagh" }), mem({ location: "Toit" })];
  for (let k = 0; k < 20; k++) assert.equal(buildRememberQuestion(few[0], few, () => k / 20).kind, "month", "not enough other places → never a 'where' question");
  const nowhere = buildRememberQuestion(mem({ location: "", date: "2026-01-05" }), all, () => 0.1);
  assert.equal(nowhere.kind, "month");
  assert.ok(nowhere.choices.includes("2026-01") && nowhere.choices.some((c) => c.startsWith("2025-")), "decoy months wrap across years");
  assert.equal(monthLabel("2026-08"), "august 2026");
});

test("remember-when picks an unplayed memory, preferring ones with photos", () => {
  const plain = mem(), photo = mem({ photos: ["p"] }), played = mem({ photos: ["p"] });
  const games = [game({ type: "remember_when", prompt: played.id, attempts: [att("x", "me", false)] })];
  for (let k = 0; k < 10; k++) assert.equal(pickRememberMemory([plain, photo, played], games, "me", () => k / 10)!.id, photo.id);
  assert.equal(pickRememberMemory([plain], [], "me", () => 0)!.id, plain.id, "falls back to photo-less");
  assert.equal(pickRememberMemory([played], games, "me"), null);
  assert.equal(pickRememberMemory([], [], "me"), null);
});

test("scores count only each person's own plays of each game type", () => {
  const games = [
    game({ type: "who_saved", attempts: [att("a", "me", true), att("a", "him", false)] }),
    game({ type: "who_saved", attempts: [att("b", "me", false)] }),
    game({ type: "remember_when", attempts: [att("c", "me", true)] }),
    game({ type: "guess_word", attempts: [att("d", "me", true)] }),
  ];
  assert.deepEqual(scoreFor(games, "me", "who_saved"), { played: 2, right: 1 });
  assert.deepEqual(scoreFor(games, "him", "who_saved"), { played: 1, right: 0 });
  assert.deepEqual(scoreFor(games, "me", "remember_when"), { played: 1, right: 1 });
  assert.deepEqual(scoreFor([], "me", "who_saved"), { played: 0, right: 0 });
});

test("remember-when month choices don't offer months that haven't happened yet", () => {
  const now = new Date(2026, 8, 21);
  const m = mem({ location: "", date: "2026-08-10" });
  for (let k = 0; k < 30; k++) {
    const q = buildRememberQuestion(m, [m], () => (k * 0.173) % 1, now);
    assert.equal(q.kind, "month");
    assert.equal(q.choices.length, 4);
    assert.ok(q.choices.every((c) => c <= "2026-09"), q.choices.join());
  }
});
