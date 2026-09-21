"use client";

import { useState } from "react";
import { MemoryCover } from "@/components/memories/MemoryCard";
import { Burst } from "@/components/ui/Burst";
import { PillButton } from "@/components/ui/bits";
import { buildRememberQuestion, monthLabel, pickRememberMemory, scoreFor, type RememberQuestion } from "@/lib/games";
import { howLongAgo } from "@/lib/memories";
import { recordPlay } from "@/lib/store";
import { useMediaUrl } from "@/lib/media";
import type { Memory } from "@/lib/types";
import { useShared } from "@/lib/useShared";
import { cn, timeAgo } from "@/lib/utils";

/* eslint-disable @next/next/no-img-element */
function Photo({ memory }: { memory: Memory }) {
  const src = useMediaUrl(memory.photos[0] ?? "");
  if (!memory.photos.length) return <MemoryCover memory={memory} ratio="4 / 3" className="rounded-[28px]" />;
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-[28px] bg-ink/[0.06]">
      {src && <img src={src} alt="a photo from one of our memories" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
    </div>
  );
}

export function RememberTab() {
  const { memories, games, meId } = useShared();
  const make = (skip?: string): RememberQuestion | null => {
    const pool = skip ? memories.filter((m) => m.id !== skip) : memories;
    const m = pickRememberMemory(pool, games, meId);
    return m ? buildRememberQuestion(m, memories) : null;
  };
  const [q, setQ] = useState<RememberQuestion | null>(() => make());
  const [picked, setPicked] = useState<string | null>(null);
  const score = scoreFor(games, meId, "remember_when");
  const history = games.filter((g) => g.type === "remember_when" && g.attempts.some((a) => a.user_id === meId)).sort((a, b) => b.attempts.find((x) => x.user_id === meId)!.created_at.localeCompare(a.attempts.find((x) => x.user_id === meId)!.created_at));
  const label = (kind: string, v: string) => (kind === "month" ? monthLabel(v) : v);

  const choose = (v: string) => {
    if (!q || picked !== null) return;
    setPicked(v);
    recordPlay("remember_when", q.memory.id, q.answer, v, v === q.answer);
  };
  const right = q && picked === q.answer;

  return (
    <div className="space-y-4">
      {score.played > 0 && <p className="px-1 text-[15px] text-mute">you&apos;re {score.right} for {score.played} so far</p>}
      {!q ? (
        <p className="rounded-[28px] bg-card p-6 text-center text-mute shadow-soft">{memories.length === 0 ? "no memories to quiz you on yet. keep a few first 📸" : "you've remembered them all 🫶 add more memories for more rounds."}</p>
      ) : (
        <div className="relative space-y-4">
          {right && <Burst />}
          <Photo memory={q.memory} />
          <h2 className="px-1 text-center font-display text-[26px] font-bold tracking-tight">{q.question}</h2>
          <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="choices">
            {q.choices.map((c) => {
              const isAnswer = c === q.answer;
              const shown = picked !== null;
              return (
                <button key={c} type="button" disabled={shown} onClick={() => choose(c)} aria-pressed={picked === c} className={cn("min-h-14 rounded-[20px] px-3 py-2 text-[15px] font-semibold shadow-soft transition-colors", shown ? (isAnswer ? "bg-[#30a46c] text-white" : picked === c ? "bg-[#c4432b] text-white" : "bg-card opacity-60") : "bg-card active:scale-95")}>
                  {label(q.kind, c)}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div role="status" className="rounded-[24px] bg-card p-4 text-center shadow-soft">
              <p className="font-display text-xl font-bold tracking-tight">{right ? "you remembered 🫶" : "so close 😅"}</p>
              <p className="mt-1 text-[15px] text-mute">{q.memory.title} · {howLongAgo(q.memory.date)}{q.memory.location ? ` · ${q.memory.location}` : ""}</p>
              <PillButton className="mt-3 w-full" onClick={() => { setPicked(null); setQ(make(q.memory.id)); }}>another one</PillButton>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <section aria-label="history" className="space-y-2">
          <h3 className="px-1 font-display text-lg font-bold tracking-tight">history</h3>
          {history.slice(0, 20).map((g) => {
            const a = g.attempts.find((x) => x.user_id === meId)!;
            const m = memories.find((x) => x.id === g.prompt);
            const asMonth = /^\d{4}-\d{2}$/.test(g.answer);
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-[22px] bg-card p-3.5 pl-4 shadow-soft">
                <span aria-hidden className="text-xl">{a.correct ? "✅" : "❌"}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{m?.title ?? "a memory we removed"}</span><span className="block truncate text-sm text-mute">you said {asMonth ? monthLabel(/^\d{4}-\d{2}$/.test(a.guess) ? a.guess : g.answer) : a.guess} · {timeAgo(a.created_at)}</span></span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
