"use client";

import Link from "next/link";
import { Icon3D } from "@/components/ui/Icon3D";
import { dateRangeLabel, tripCountdown } from "@/lib/trips";
import { useShared } from "@/lib/useShared";
import { daysUntil } from "@/lib/utils";

/** The next trip, when it's close (within ~2 months) or happening now. */
export function TripPeek() {
  const { trips } = useShared();
  const next = trips
    .filter((t) => t.start_date && daysUntil(t.end_date || t.start_date) >= 0 && daysUntil(t.start_date) <= 60)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  if (!next) return null;
  const scheduled = next.items.filter((i) => i.scheduled_date).length;
  return (
    <Link href={`/trips/${next.id}`} className="flex items-center gap-4 rounded-[28px] bg-card p-4 shadow-soft active:scale-[0.99]" aria-label={`${next.title}: ${tripCountdown(next)}`}>
      <Icon3D category="travel" className="h-14 w-14 shrink-0 drop-shadow-[0_6px_6px_rgba(0,0,0,0.2)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">coming up ✈️</p>
        <p className="truncate font-display text-xl font-semibold tracking-tight">{next.title}</p>
        <p className="text-sm text-mute">{[dateRangeLabel(next), tripCountdown(next)].filter(Boolean).join(" · ")} · {scheduled} of {next.items.length} planned</p>
      </div>
    </Link>
  );
}
