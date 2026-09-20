"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { PillButton } from "@/components/ui/bits";
import { itemEmoji } from "@/lib/categories";
import { planItem, useStore } from "@/lib/store";
import type { CategoryId, SavedItem } from "@/lib/types";
import { nextSaturday, toISODate } from "@/lib/utils";

const PHRASE: Record<CategoryId, (t: string) => string> = {
  eat: (t) => `eat at ${t}`,
  watch: (t) => `watch ${t}`,
  do: (t) => `try ${t}`,
  places: (t) => `go to ${t}`,
  shop: (t) => `go look at ${t}`,
  travel: (t) => `dream up ${t}`,
  ideas: (t) => t,
};

/** 🎲 surprise us — plain local randomness over things that are still open. */
export function PickForUs() {
  const { items } = useStore();
  const { toast } = useAppUI();
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [face, setFace] = useState("🎲");
  const [pick, setPick] = useState<SavedItem | null>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const pool = items.filter((i) => i.status === "saved" || i.status === "maybe");

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const spin = (skipId?: string) => {
    const candidates = pool.filter((i) => i.id !== skipId);
    if (candidates.length === 0) return;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    setPhase("spinning");
    let n = 0;
    const iv = setInterval(() => {
      setFace(itemEmoji(pool[n++ % pool.length]));
      if (n > 9) {
        clearInterval(iv);
        setPick(chosen);
        setPhase("result");
      }
    }, 95);
    timers.current.push(iv);
  };

  const accept = () => {
    if (!pick) return;
    planItem(pick.id, toISODate(nextSaturday()));
    toast("saturday is sorted", "🗓️");
    setPhase("idle");
    setPick(null);
    setFace("🎲");
  };

  return (
    <section aria-labelledby="pick-h" className="theme-light rounded-[32px] bg-sun p-5 shadow-soft">
      <h2 id="pick-h" className="font-display text-2xl font-bold tracking-tight">pick for us</h2>
      <p className="text-[15px] text-ink/60">can&apos;t decide? let luck do it.</p>

      <div className="mt-4 min-h-[88px]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "result" && pick ? (
            <motion.div key={pick.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", stiffness: 360, damping: 24 }}>
              <div className="rounded-[24px] bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">saturday?</p>
                <p className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight">
                  {PHRASE[pick.category](pick.title)} {itemEmoji(pick)}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <PillButton onClick={accept} className="flex-1">let&apos;s do it</PillButton>
                <PillButton tone="glass" onClick={() => spin(pick.id)} className="flex-1">not today</PillButton>
              </div>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4">
              <motion.span
                aria-hidden
                animate={phase === "spinning" ? { rotate: [0, 12, -12, 0], y: [0, -8, 0] } : { rotate: 0 }}
                transition={phase === "spinning" ? { repeat: Infinity, duration: 0.35 } : {}}
                className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[28px] bg-white/80 text-5xl"
              >
                {face}
              </motion.span>
              {pool.length === 0 ? (
                <p className="text-ink/70">nothing saved to pick from yet. hit + first.</p>
              ) : (
                <PillButton onClick={() => spin()} disabled={phase === "spinning"} size="lg" className="flex-1">
                  🎲 surprise us
                </PillButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
