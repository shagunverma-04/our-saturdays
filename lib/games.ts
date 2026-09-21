// Deterministic game logic (no AI, no randomness you can't inject). Pure, so it's unit-tested.
import type { Game, GameAttempt, Memory, SavedItem } from "./types.ts";

/** "The  Ramen-Place!" → "the ramen place": case, accents, punctuation and spacing don't make a right answer wrong. */
export function normalizeGuess(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export const isCorrectGuess = (guess: string, answer: string) => normalizeGuess(answer) !== "" && normalizeGuess(guess) === normalizeGuess(answer);

// ---- guess the word ------------------------------------------------------------

export interface GuessState {
  solved: boolean;
  tries: number;
  wrong: GameAttempt[];
  solvedBy: string | null;
  lastAt: string | null;
}

export function guessState(game: Game): GuessState {
  const attempts = [...game.attempts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const win = attempts.find((a) => a.correct);
  return { solved: Boolean(win), tries: attempts.length, wrong: attempts.filter((a) => !a.correct), solvedBy: win?.user_id ?? null, lastAt: attempts.length ? attempts[attempts.length - 1].created_at : null };
}

// ---- who saved this? ---------------------------------------------------------------

/** A find you haven't played yet, at least `minDays` old (recent ones are too easy). Older first, so the "sitting on our list" line lands. */
export function pickWhoSaved(items: SavedItem[], games: Game[], meId: string, rand = Math.random, now = new Date(), minDays = 3): SavedItem | null {
  const played = new Set(games.filter((g) => g.type === "who_saved" && g.attempts.some((a) => a.user_id === meId)).map((g) => g.prompt));
  const pool = items.filter((i) => i.status !== "archived" && !played.has(i.id) && (now.getTime() - new Date(i.created_at).getTime()) / 86_400_000 >= minDays);
  if (!pool.length) return null;
  pool.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const top = pool.slice(0, Math.max(1, Math.ceil(pool.length / 2))); // the older half
  return top[Math.floor(rand() * top.length)];
}

// ---- remember when? ----------------------------------------------------------------

export type RememberKind = "month" | "where";
export interface RememberQuestion {
  memory: Memory;
  kind: RememberKind;
  question: string;
  answer: string; // the value the choices are compared against
  choices: string[]; // shuffled, includes the answer
}

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export const monthLabel = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const shuffle = <T,>(a: T[], rand: () => number) => {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * A question about a memory. "where were we?" needs at least 3 OTHER distinct places to offer as wrong answers, and the
 * memory to have a place; otherwise it's "what month was this?" with nearby months as decoys. Never a question with no wrong answers.
 */
export function buildRememberQuestion(memory: Memory, all: Memory[], rand = Math.random, now = new Date()): RememberQuestion {
  const places = [...new Set(all.map((m) => m.location.trim()).filter(Boolean))];
  const otherPlaces = places.filter((p) => p.toLowerCase() !== memory.location.trim().toLowerCase());
  if (memory.location.trim() && otherPlaces.length >= 3 && rand() < 0.5) {
    const decoys = shuffle(otherPlaces, rand).slice(0, 3);
    return { memory, kind: "where", question: "where were we?", answer: memory.location.trim(), choices: shuffle([memory.location.trim(), ...decoys], rand) };
  }
  const ym = memory.date.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const key = (t: Date) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
  const nowKey = key(now);
  const near = [-3, -2, -1, 1, 2, 3].map((d) => key(new Date(y, m - 1 + d, 1)));
  // a month that hasn't happened yet is an obvious wrong answer, so only use one if there's no other choice
  const past = near.filter((k) => k <= nowKey);
  const pool = past.length >= 3 ? past : near;
  const decoys = shuffle(pool, rand).slice(0, 3);
  return { memory, kind: "month", question: "what month was this?", answer: ym, choices: shuffle([ym, ...decoys], rand) };
}

/** A memory you haven't played, with a photo preferred (the game is about the picture). */
export function pickRememberMemory(memories: Memory[], games: Game[], meId: string, rand = Math.random): Memory | null {
  const played = new Set(games.filter((g) => g.type === "remember_when" && g.attempts.some((a) => a.user_id === meId)).map((g) => g.prompt));
  const fresh = memories.filter((m) => !played.has(m.id));
  if (!fresh.length) return null;
  const withPhotos = fresh.filter((m) => m.photos.length > 0);
  const pool = withPhotos.length ? withPhotos : fresh;
  return pool[Math.floor(rand() * pool.length)];
}

// ---- history & score -----------------------------------------------------------------

export interface Score {
  played: number;
  right: number;
}

export function scoreFor(games: Game[], userId: string, type: "who_saved" | "remember_when"): Score {
  let played = 0, right = 0;
  for (const g of games) {
    if (g.type !== type) continue;
    const a = g.attempts.find((x) => x.user_id === userId);
    if (a) {
      played++;
      if (a.correct) right++;
    }
  }
  return { played, right };
}
