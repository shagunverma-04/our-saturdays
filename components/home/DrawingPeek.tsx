"use client";

import Link from "next/link";
import { DrawingImage } from "@/components/draw/DrawingImage";
import { useShared } from "@/lib/useShared";

/** "Aarav drew something for you 🎨": only when there's a drawing from your person you haven't opened yet. */
export function DrawingPeek() {
  const { drawings, meId, profiles } = useShared();
  const fresh = drawings.find((d) => d.created_by !== meId && !d.seen_by.includes(meId));
  if (!fresh) return null;
  const name = profiles.find((p) => p.id === fresh.created_by)?.name ?? "someone";
  return (
    <Link href={`/draw?open=${fresh.id}`} className="flex items-center gap-4 rounded-[28px] bg-card p-3 shadow-soft active:scale-[0.99]" aria-label={`${name} drew something for you`}>
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[18px]"><DrawingImage image={fresh.image} alt="" className="h-full w-full object-cover" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mute">new drawing 🎨</p>
        <p className="mt-1 font-display text-xl font-semibold leading-tight tracking-tight">{name} drew something for you</p>
        {fresh.caption && <p className="mt-1 line-clamp-1 text-[14px] text-ink/70">“{fresh.caption}”</p>}
        <p className="mt-1 text-sm font-semibold text-mute">take a look →</p>
      </div>
    </Link>
  );
}
