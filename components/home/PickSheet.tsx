"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ItemArt } from "@/components/ui/ItemArt";
import { PillButton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { iconFor, itemEmoji } from "@/lib/categories";
import { recentPicks, rememberPick } from "@/lib/pickHistory";
import { pickPool, weightedPick } from "@/lib/shared";
import { planItem } from "@/lib/store";
import type { SavedItem } from "@/lib/types";
import { useShared } from "@/lib/useShared";
import { nextSaturday, toISODate } from "@/lib/utils";

export function PickSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="pick for us">
      <Picker onClose={onClose} />
    </Sheet>
  );
}

function Picker({ onClose }: { onClose: () => void }) {
  const { items, interactions, meId, plannedIds } = useShared();
  const { toast } = useAppUI();
  const [phase, setPhase] = useState<"spinning" | "result" | "empty">("spinning");
  const [face, setFace] = useState("🎲");
  const [pick, setPick] = useState<SavedItem | null>(null);
  const [sharedPool, setSharedPool] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const { pool, shared } = pickPool(items, interactions, meId, plannedIds);

  const spin = () => {
    if (!pool.length) return setPhase("empty");
    setPhase("spinning");
    const chosen = weightedPick(pool, interactions, meId, recentPicks());
    let n = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setFace(itemEmoji(pool[n++ % pool.length]));
      if (n > 11) {
        clearInterval(timer.current);
        if (!chosen) return setPhase("empty");
        rememberPick(chosen.id);
        setPick(chosen);
        setSharedPool(shared);
        setPhase("result");
      }
    }, 90);
  };

  useEffect(() => {
    // deferred a tick: the picker starts rolling as soon as the sheet opens
    const t = setTimeout(spin, 60);
    return () => {
      clearTimeout(t);
      clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSaturday = new Date().getDay() === 6;

  return (
    <div className="pb-2" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {phase === "empty" ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
            <p className="text-5xl" aria-hidden>🫥</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">nothing to pick from yet</h2>
            <p className="mt-1 text-mute">save a few things, or react to your person&apos;s finds. then roll again.</p>
            <PillButton className="mt-5" onClick={onClose}>ok</PillButton>
          </motion.div>
        ) : phase === "spinning" ? (
          <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-10">
            <motion.span aria-hidden animate={{ rotate: [0, 10, -10, 0], y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.36 }} className="flex h-28 w-28 items-center justify-center rounded-[36px] bg-card text-6xl shadow-float">
              {face}
            </motion.span>
            <p className="mt-6 font-display text-xl font-semibold tracking-tight">rolling…</p>
          </motion.div>
        ) : (
          pick && (
            <motion.div key={pick.id} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 340, damping: 24 }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{isSaturday ? "tonight's pick 👀" : "saturday's pick 👀"}</p>
              {pick.image_url ? (
                <div className="mt-3 aspect-[16/10] overflow-hidden rounded-[28px] shadow-soft">
                  <ItemArt item={pick} priority />
                </div>
              ) : (
                <div className="mt-3 flex justify-center py-3">
                  <CategoryIcon category={iconFor(pick)} size="lg" className="scale-[1.5]" />
                </div>
              )}
              <h2 className="mt-4 font-display text-[30px] font-bold leading-tight tracking-tight">{pick.title}</h2>
              <p className="text-[15px] text-mute">{pick.description || pick.location_name || pick.category}</p>
              {!sharedPool && <p className="mt-2 text-sm text-mute">nothing you both like yet, so this is just a fun find. ❤️ things to fix that.</p>}
              <div className="mt-5 flex flex-col gap-2.5">
                <PillButton
                  size="lg"
                  onClick={() => {
                    planItem(pick.id, toISODate(nextSaturday()));
                    toast("saturday is sorted", "🗓️");
                    onClose();
                  }}
                >
                  let&apos;s do it
                </PillButton>
                <div className="flex gap-2.5">
                  <PillButton tone="ghost" size="lg" className="flex-1" onClick={spin}>not today</PillButton>
                  <PillButton tone="ghost" size="lg" className="flex-1" onClick={onClose}>save for later</PillButton>
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
