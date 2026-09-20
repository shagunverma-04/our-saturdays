"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ItemArt } from "@/components/ui/ItemArt";
import { MapBackdrop } from "@/components/ui/MapBackdrop";
import { PillButton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { useAppUI } from "@/components/ui/AppUI";
import { itemEmoji } from "@/lib/categories";
import { planItem, setStatus, useStore } from "@/lib/store";
import { countdown, nextSaturday, shortDate, toISODate } from "@/lib/utils";

export function NextSaturday() {
  const { items, plans } = useStore();
  const { toast, openAdd } = useAppUI();
  const [picking, setPicking] = useState(false);

  const sat = useMemo(() => nextSaturday(), []);
  const iso = toISODate(sat);
  const plan = plans.find((p) => p.date === iso);
  const item = plan?.saved_item_id ? items.find((i) => i.id === plan.saved_item_id) : undefined;

  const label = (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/60">
      next saturday · {shortDate(iso)} · {countdown(iso)}
    </p>
  );

  return (
    <section aria-label="next saturday" className={`relative overflow-hidden rounded-[36px] shadow-float ${plan && item ? "h-[360px]" : "h-[320px]"}`}>
      {plan && item ? <ItemArt item={item} priority emojiClass="mb-[200px] text-[84px]" className="absolute inset-0" /> : <MapBackdrop />}

      {!plan && (
        <div className="absolute inset-x-0 top-8 flex justify-center" aria-hidden>
          <div className="floaty flex flex-col items-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-3xl shadow-float">👀</span>
            <span className="-mt-1 h-3 w-3 rotate-45 rounded-[2px] bg-ink" />
            <span className="mt-2 h-2 w-8 rounded-full bg-ink/15 blur-[2px]" />
          </div>
        </div>
      )}

      <div className="glass absolute inset-x-3 bottom-3 rounded-[28px] p-5 shadow-soft">
        {label}
        {plan && item ? (
          <>
            <Link href={`/later/${item.id}`} className="mt-1 block">
              <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight">
                {itemEmoji(item)} {plan.title}
              </h2>
              {item.location_name && <p className="text-[15px] text-ink/60">📍 {item.location_name}</p>}
            </Link>
            <div className="mt-4 flex gap-2">
              <PillButton onClick={() => { setStatus(item.id, "done"); toast("we did it!", "🎉"); }} className="flex-1">
                we did it 🎉
              </PillButton>
              <PillButton tone="ghost" onClick={() => setPicking(true)}>
                swap
              </PillButton>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-1 whitespace-nowrap font-display text-[26px] font-bold leading-tight tracking-tight">nothing planned yet 👀</h2>
            <PillButton onClick={() => setPicking(true)} className="mt-4 w-full" size="lg">
              pick something
            </PillButton>
          </>
        )}
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title="pick something for saturday">
        <PickList
          onPick={(id, title) => {
            planItem(id, iso);
            setPicking(false);
            toast(`${title} — saturday`, "🗓️");
          }}
          onNew={() => { setPicking(false); openAdd(); }}
        />
      </Sheet>
    </section>
  );
}

function PickList({ onPick, onNew }: { onPick: (id: string, title: string) => void; onNew: () => void }) {
  const { items } = useStore();
  const pool = items.filter((i) => i.status === "saved" || i.status === "maybe").sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="pb-2">
      <h2 className="font-display text-[28px] font-bold tracking-tight">what&apos;s it gonna be?</h2>
      <ul className="mt-4 space-y-2">
        {pool.slice(0, 12).map((i) => (
          <li key={i.id}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(i.id, i.title)}
              className="flex w-full items-center gap-3 rounded-[22px] bg-card p-3 text-left shadow-soft"
            >
              <CategoryIcon category={i.category} emoji={itemEmoji(i)} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{i.title}</span>
                <span className="block truncate text-sm text-mute">{i.description || i.location_name || i.category}</span>
              </span>
            </motion.button>
          </li>
        ))}
      </ul>
      <PillButton tone="ghost" size="lg" className="mt-4 w-full" onClick={onNew}>
        something new +
      </PillButton>
    </div>
  );
}
