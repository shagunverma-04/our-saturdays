"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Icon3D } from "@/components/ui/Icon3D";
import { ItemArt } from "@/components/ui/ItemArt";
import { MapBackdrop } from "@/components/ui/MapBackdrop";
import { PillButton } from "@/components/ui/bits";
import { useAppUI } from "@/components/ui/AppUI";
import { iconFor, itemEmoji } from "@/lib/categories";
import { saturdayCandidates } from "@/lib/shared";
import { planItem, setPlanTime, setStatus } from "@/lib/store";
import { formatTime12, whenLabel } from "@/lib/calendar";
import { useShared } from "@/lib/useShared";
import { countdown, daysUntil, nextSaturday, shortDate, toISODate } from "@/lib/utils";
import { PickSheet } from "./PickSheet";

function why(mine: boolean, theirs: boolean, score: number, partner?: string): string {
  if (mine && theirs) return "you both said saturday";
  if (theirs) return `${partner ?? "they"} said saturday`;
  if (mine) return "you said saturday";
  return score >= 40 ? "you both like it" : "fresh find";
}

/**
 * "saturday? 👀" — never a planner you fill in. It looks at what you both like (and what either of you
 * said "saturday?" to) and offers it; or rolls the dice. A plan only exists once you say "let's do it".
 */
export function SaturdaySection() {
  const { items, plans, interactions, meId, plannedIds, partner } = useShared();
  const { toast } = useAppUI();
  const [picking, setPicking] = useState(false);

  const iso = toISODate(useMemo(() => nextSaturday(), []));
  const days = daysUntil(iso);
  const plan = plans.find((p) => p.date === iso);
  const planned = plan?.saved_item_id ? items.find((i) => i.id === plan.saved_item_id) : undefined;
  const candidates = useMemo(() => saturdayCandidates(items, interactions, meId, plannedIds).slice(0, 3), [items, interactions, meId, plannedIds]);

  const heading = days === 0 ? "today 🎉" : days <= 3 ? "saturday? 👀" : "coming saturday";
  const label = (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/60">
      {heading === "saturday? 👀" ? "this saturday" : "saturday"} · {shortDate(iso)} · {countdown(iso)}
    </p>
  );

  return (
    <section aria-label="saturday" className="relative overflow-hidden rounded-[36px] shadow-float">
      {planned?.image_url ? <ItemArt item={planned} priority className="absolute inset-0" /> : <MapBackdrop />}

      <div className={planned ? "flex min-h-[380px] flex-col justify-end" : "flex min-h-[360px] flex-col justify-end"}>
        {!planned?.image_url && (
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center" aria-hidden>
            <div className="floaty flex flex-col items-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-2xl text-on-ink shadow-float">
                {planned ? <Icon3D category={iconFor(planned)} className="h-9 w-9" /> : "👀"}
              </span>
              <span className="-mt-1 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-ink" />
            </div>
          </div>
        )}

        <div className="glass relative m-3 rounded-[28px] p-5 shadow-soft">
          {label}
          {planned && plan ? (
            <>
              <Link href={`/later/${planned.id}`} className="mt-1 block">
                <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight">
                  {itemEmoji(planned)} {plan.title}
                </h2>
                {planned.location_name && <p className="text-[15px] text-ink/60">📍 {planned.location_name}</p>}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">{whenLabel(plan.date, plan.time)}</span>
                <label className="relative flex h-9 items-center rounded-full bg-ink/[0.07] px-3.5 text-[13px] font-semibold">
                  {plan.time ? `🕕 ${formatTime12(plan.time)}` : "＋ add a time"}
                  <input type="time" value={plan.time ?? ""} onChange={(e) => setPlanTime(plan.id, e.target.value || null)} aria-label="time (optional)" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </label>
                {plan.time && <button type="button" onClick={() => setPlanTime(plan.id, null)} aria-label="clear the time" className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.07] text-mute">✕</button>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <PillButton className="flex-1" onClick={() => { setStatus(planned.id, "done"); toast("we did it!", "🎉"); }}>we did it 🎉</PillButton>
                <PillButton tone="ghost" onClick={() => setPicking(true)}>swap</PillButton>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-tight">{heading}</h2>
              {candidates.length > 0 ? (
                <>
                  <p className="mt-1 text-[14px] text-ink/60">{candidates.some((c) => c.score >= 70) ? "you've been eyeing:" : partner ? "you both liked:" : "on our list:"}</p>
                  <ul className="mt-2 space-y-1.5">
                    {candidates.map((c) => (
                      <li key={c.item.id}>
                        <div className="flex items-center gap-3 rounded-2xl bg-ink/[0.05] p-2">
                          <Link href={`/later/${c.item.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <CategoryIcon category={c.item.category} emoji={itemEmoji(c.item)} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-semibold">{c.item.title}</span>
                              <span className="block truncate text-[12px] text-ink/55">{why(c.sig.saturdayMine, c.sig.saturdayTheirs, c.score, partner?.name)}</span>
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => { planItem(c.item.id, iso); toast(`${c.item.title} — saturday`, "🗓️"); }}
                            className="h-9 shrink-0 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-on-ink"
                            aria-label={`lock in ${c.item.title} for saturday`}
                          >
                            lock it
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-[15px] text-ink/60">nothing you both like yet. ❤️ something, or roll the dice.</p>
              )}
              <PillButton size="lg" className="mt-4 w-full" onClick={() => setPicking(true)}>🎲 pick for us</PillButton>
            </>
          )}
        </div>
      </div>

      <PickSheet open={picking} onClose={() => setPicking(false)} />
    </section>
  );
}
