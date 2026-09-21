"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { EmptyState, PillButton, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { Icon3D } from "@/components/ui/Icon3D";
import { budgetSummary, dateRangeLabel, formatINR, tripCountdown } from "@/lib/trips";
import { useShared } from "@/lib/useShared";
import { toISODate } from "@/lib/utils";

export default function TripsPage() {
  const { ready, trips } = useShared();
  const { openTrip } = useAppUI();

  const ordered = useMemo(() => {
    const today = toISODate(new Date());
    const upcoming = trips.filter((t) => t.start_date && (t.end_date || t.start_date) >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
    const undated = trips.filter((t) => !t.start_date);
    const past = trips.filter((t) => t.start_date && (t.end_date || t.start_date) < today).sort((a, b) => b.start_date.localeCompare(a.start_date));
    return [...upcoming, ...undated, ...past];
  }, [trips]);

  return (
    <main>
      <ScreenHeader title="trips" subtitle="little worlds we plan together" />
      {!ready ? (
        <Skeleton className="h-40" />
      ) : ordered.length === 0 ? (
        <EmptyState emoji="🧳" title="where are we going next?" body="a trip is a little space: places, food, where to stay, a day-by-day plan, and a budget." action={<PillButton onClick={() => openTrip()}>plan a trip</PillButton>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {ordered.map((t) => {
            const b = budgetSummary(t);
            return (
              <Link key={t.id} href={`/trips/${t.id}`} className="flex items-center gap-4 rounded-card bg-card p-5 shadow-soft active:scale-[0.99]">
                <Icon3D category="travel" className="h-16 w-16 shrink-0 drop-shadow-[0_6px_6px_rgba(0,0,0,0.2)]" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-2xl font-bold leading-tight tracking-tight">{t.title}</h2>
                  <p className="mt-0.5 text-[15px] text-mute">{[dateRangeLabel(t), tripCountdown(t)].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1.5 text-sm text-ink/70">{t.items.length} thing{t.items.length === 1 ? "" : "s"} planned{b.estimate != null ? ` · ${formatINR(b.spent)} of ${formatINR(b.estimate)}` : b.spent > 0 ? ` · ${formatINR(b.spent)} spent` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
