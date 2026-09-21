"use client";

import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { Burst } from "@/components/ui/Burst";
import { PillButton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { guessState } from "@/lib/games";
import { createGuessGame, removeGame, submitGuess } from "@/lib/store";
import type { Game } from "@/lib/types";
import { useShared } from "@/lib/useShared";
import { timeAgo } from "@/lib/utils";

const inputCls = "h-14 w-full rounded-[20px] bg-card px-4 text-ink shadow-soft placeholder:text-mute/80 outline-none focus:ring-2 focus:ring-ink/20";
const card = "rounded-[28px] bg-card p-5 shadow-soft";

function NewWord({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    createGuessGame({ prompt: prompt.trim() || "what is it?", answer: answer.trim(), hint: hint.trim() });
    setPrompt(""); setAnswer(""); setHint("");
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="new word">
      <form onSubmit={submit} className="pb-2">
        <h2 className="font-display text-[28px] font-bold tracking-tight">pick a word</h2>
        <div className="mt-4 space-y-3">
          <input className={inputCls} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="the word (Pottery)" aria-label="the word" autoFocus autoComplete="off" />
          <input className={inputCls} value={hint} onChange={(e) => setHint(e.target.value)} placeholder="a hint: something we've been saying for 6 months" aria-label="hint" autoComplete="off" />
          <input className={inputCls} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="the question (what is it?)" aria-label="question" autoComplete="off" />
        </div>
        <PillButton type="submit" size="lg" className="mt-5 w-full" disabled={!answer.trim()}>send it</PillButton>
      </form>
    </Sheet>
  );
}

function PlayCard({ game }: { game: Game }) {
  const { profiles, meId } = useShared();
  const [text, setText] = useState("");
  const [result, setResult] = useState<"none" | "wrong" | "right">("none");
  const st = guessState(game);
  const name = profiles.find((p) => p.id === game.created_by)?.name ?? "they";

  const guess = (e: FormEvent) => {
    e.preventDefault();
    const a = submitGuess(game.id, text);
    if (!a) return;
    setText("");
    setResult(a.correct ? "right" : "wrong");
  };

  const done = st.solved || result === "right";
  return (
    <div className={`${card} relative`}>
      {result === "right" && <Burst />}
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">from {name}</p>
      <h3 className="mt-1 font-display text-[22px] font-semibold leading-snug tracking-tight">{game.prompt}</h3>
      {game.hint && <p className="mt-1 text-[15px] text-mute">hint: {game.hint}</p>}
      {st.wrong.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="your guesses so far">
          {st.wrong.filter((a) => a.user_id === meId).map((a) => <span key={a.id} className="rounded-full bg-ink/[0.07] px-3 py-1 text-sm line-through decoration-ink/30">{a.guess}</span>)}
        </div>
      )}
      {done ? (
        <p className="mt-4 font-display text-xl font-bold" role="status">you got it 🫶 <span className="text-mute">({st.tries} {st.tries === 1 ? "try" : "tries"})</span></p>
      ) : (
        <motion.form onSubmit={guess} className="mt-4 flex gap-2" animate={result === "wrong" ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }} key={st.tries}>
          <input className={inputCls} value={text} onChange={(e) => { setText(e.target.value); setResult("none"); }} placeholder="your guess" aria-label="your guess" autoComplete="off" />
          <PillButton type="submit" size="lg" disabled={!text.trim()}>guess</PillButton>
        </motion.form>
      )}
      {result === "wrong" && <p role="status" className="mt-2 px-1 text-sm text-mute">not quite. try again 👀</p>}
    </div>
  );
}

export function GuessTab() {
  const { games, meId, partner, profiles } = useShared();
  const [adding, setAdding] = useState(false);
  const all = games.filter((g) => g.type === "guess_word");
  const forMe = all.filter((g) => g.created_by !== meId);
  const waiting = forMe.filter((g) => !guessState(g).solved);
  const mine = all.filter((g) => g.created_by === meId);
  const solved = all.filter((g) => guessState(g).solved).sort((a, b) => (guessState(b).lastAt ?? "").localeCompare(guessState(a).lastAt ?? ""));
  const nameOf = (id: string | null) => (id === meId ? "you" : profiles.find((p) => p.id === id)?.name ?? "they");

  return (
    <div className="space-y-4">
      <PillButton size="lg" className="w-full" onClick={() => setAdding(true)} disabled={!partner}>✍️ leave {partner ? `${partner.name} ` : "them "}a word to guess</PillButton>
      {!partner && <p className="px-1 text-sm text-mute">this one needs both of you in the space.</p>}

      {waiting.map((g) => <PlayCard key={g.id} game={g} />)}
      {waiting.length === 0 && forMe.length === 0 && <p className="px-1 text-[15px] text-mute">no words for you yet. hint it.</p>}

      {mine.filter((g) => !guessState(g).solved).length > 0 && (
        <section aria-label="waiting on them" className="space-y-2">
          <h3 className="px-1 font-display text-lg font-bold tracking-tight">you asked</h3>
          {mine.filter((g) => !guessState(g).solved).map((g) => {
            const st = guessState(g);
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-[22px] bg-card p-4 shadow-soft">
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{g.answer}</span><span className="block truncate text-sm text-mute">{st.tries ? `${st.tries} wrong guess${st.tries === 1 ? "" : "es"} so far` : "waiting…"} · {timeAgo(g.created_at)}</span></span>
                <button type="button" onClick={() => removeGame(g.id)} aria-label={`remove ${g.answer}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.07] text-mute">✕</button>
              </div>
            );
          })}
        </section>
      )}

      {solved.length > 0 && (
        <section aria-label="history" className="space-y-2">
          <h3 className="px-1 font-display text-lg font-bold tracking-tight">history</h3>
          {solved.map((g) => {
            const st = guessState(g);
            return (
              <div key={g.id} className="rounded-[22px] bg-card p-4 shadow-soft">
                <p className="font-semibold">🎉 {g.answer}</p>
                <p className="text-sm text-mute">{nameOf(st.solvedBy)} got it in {st.tries} {st.tries === 1 ? "try" : "tries"} · {g.prompt}</p>
              </div>
            );
          })}
        </section>
      )}
      <NewWord open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
