"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Burst } from "@/components/ui/Burst";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PillButton } from "@/components/ui/bits";
import { itemEmoji } from "@/lib/categories";
import { recordPlay, useStore } from "@/lib/store";
import { pickWhoSaved } from "@/lib/games";
import type { SavedItem } from "@/lib/types";
import { daysSince } from "@/lib/utils";

/** A tiny, skippable round of "who saved this?" on Home. It counts toward the full game's score and history. */
export function LittleMoment() {
  const { items, profiles, games, meId } = useStore();
  const [item, setItem] = useState<SavedItem | null>(() => pickWhoSaved(items, games, meId));
  const [answer, setAnswer] = useState<string | null>(null);

  // it's a two-person game: needs both of you in the space
  if (!item || profiles.length < 2) return null;
  const days = daysSince(item.created_at);
  const right = answer === item.created_by;
  const author = profiles.find((p) => p.id === item.created_by);

  const next = () => {
    setAnswer(null);
    setItem(pickWhoSaved(items.filter((i) => i.id !== item.id), games, meId));
  };

  return (
    <section aria-labelledby="moment-h" className="relative rounded-[32px] bg-card p-5 shadow-soft">
      <p id="moment-h" className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">one little thing</p>
      <div className="mt-3 flex items-center gap-4">
        <CategoryIcon category={item.category} emoji={itemEmoji(item)} size="lg" />
        <p className="font-display text-[19px] font-semibold leading-snug tracking-tight">
          this has been sitting on our list for {days} days.
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {answer === null ? (
          <motion.div key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
            <p className="mb-2 ml-1 text-[15px] font-semibold">who saved this?</p>
            <div className="flex gap-2">
              {profiles.map((p) => (
                <PillButton key={p.id} tone="ghost" className="flex-1" onClick={() => { setAnswer(p.id); recordPlay("who_saved", item.id, item.created_by, p.id, p.id === item.created_by); }}>
                  {p.avatar} {p.name}
                </PillButton>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative mt-4">
            {right && <Burst />}
            <p className="text-center font-display text-xl font-bold tracking-tight">
              {right ? "you got it 🫶" : `nope — ${author?.name ?? "someone"} did`}
            </p>
            <p className="mt-0.5 text-center text-sm text-mute">{item.title}</p>
            <PillButton tone="ghost" className="mt-3 w-full" onClick={next}>another one</PillButton>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
