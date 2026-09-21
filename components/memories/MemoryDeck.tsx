"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { howLongAgo, longDate } from "@/lib/memories";
import { useMediaUrl } from "@/lib/media";
import { useStore } from "@/lib/store";
import type { Memory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MemoryCover } from "./MemoryCard";

/** One photo, full screen. Tall photos fill the screen; wide ones sit on a soft blur of themselves (no ugly crop, no black bars). */
function Slide({ photoRef, alt }: { photoRef: string; alt: string }) {
  const src = useMediaUrl(photoRef);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  return (
    <div className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden bg-black">
      {src ? (
        <>
          {fit === "contain" && <img src={src} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />}
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={(e) => setFit(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth > 1.1 ? "cover" : "contain")}
            className={cn("relative h-full w-full", fit === "cover" ? "object-cover" : "object-contain")}
          />
        </>
      ) : (
        <div className="skeleton h-full w-full !rounded-none" />
      )}
    </div>
  );
}

/** A memory's photos: swipe left/right. Dots show where you are; chevrons appear on wide screens. */
function Strip({ memory }: { memory: Memory }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const n = memory.photos.length;
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth, behavior: "smooth" });

  return (
    <div className="relative h-full">
      <div
        ref={ref}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${memory.title}, ${n} photo${n === 1 ? "" : "s"}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none"
      >
        {n === 0 ? (
          <div className="h-full w-full shrink-0 snap-center">
            <MemoryCover memory={memory} fill className="h-full w-full" emojiClass="text-[120px]" />
          </div>
        ) : (
          // keyed by position: a photo's reference can repeat (the same picture twice), a slot number can't
          memory.photos.map((p, i) => <Slide key={i} photoRef={p} alt={`${memory.title} — photo ${i + 1} of ${n}`} />)
        )}
      </div>

      {n > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-[calc(4.6rem+env(safe-area-inset-top))] flex justify-center gap-1.5" aria-hidden>
            {memory.photos.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full bg-white transition-all", i === idx ? "w-5 opacity-100" : "w-1.5 opacity-50")} />
            ))}
          </div>
          {idx > 0 && (
            <button type="button" onClick={() => go(-1)} aria-label="previous photo" className="glass absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full md:flex">‹</button>
          )}
          {idx < n - 1 && (
            <button type="button" onClick={() => go(1)} aria-label="next photo" className="glass absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full md:flex">›</button>
          )}
        </>
      )}
    </div>
  );
}

interface DeckProps {
  memories: Memory[]; // already in swipe order
  startId?: string;
  onGrid: () => void;
  onMore: (m: Memory) => void;
}

/**
 * Full-screen, swipeable memories. Swipe UP/DOWN to move between memories, LEFT/RIGHT through a memory's photos.
 * Built on native scroll-snap so it feels exactly like the phone's own scrolling (momentum, rubber-banding).
 */
export function MemoryDeck({ memories, startId, onGrid, onMore }: DeckProps) {
  const { trips } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const startIdx = Math.max(0, memories.findIndex((m) => m.id === startId));
  const [current, setCurrent] = useState(startIdx);
  const [scrolled, setScrolled] = useState(false);
  const currentId = useRef(memories[startIdx]?.id);

  // open at the memory you came for
  useEffect(() => {
    const el = scroller.current;
    if (el && startIdx > 0) el.scrollTop = startIdx * el.clientHeight;
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a memory added (or removed) elsewhere mustn't yank you off the one you're looking at
  useEffect(() => {
    const el = scroller.current;
    if (!el || !currentId.current) return;
    const i = memories.findIndex((m) => m.id === currentId.current);
    if (i >= 0 && Math.round(el.scrollTop / el.clientHeight) !== i) el.scrollTop = i * el.clientHeight;
  }, [memories]);

  const here = memories[Math.min(current, memories.length - 1)];

  return (
    <div className="fixed inset-0 z-30 bg-black text-white">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollTop / el.clientHeight);
          setCurrent(i);
          currentId.current = memories[i]?.id;
          if (el.scrollTop > 24) setScrolled(true);
        }}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
        aria-label="memories, swipe up or down"
      >
        {memories.map((m) => (
          <section key={m.id} data-memory={m.id} className="relative h-dvh snap-start snap-always" aria-label={m.title}>
            <Strip memory={m} />
            {/* the words, low on the screen and clear of the nav */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-[calc(8.6rem+env(safe-area-inset-bottom))] pr-24 pt-28">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">
                {longDate(m.date)} · {howLongAgo(m.date)}
              </p>
              <h2 className="mt-1 font-display text-[32px] font-bold leading-[1.05] tracking-tight">{m.title}</h2>
              {m.location && <p className="mt-1.5 text-[15px] font-medium text-white/85">📍 {m.location}</p>}
              {m.trip_id && trips.find((t) => t.id === m.trip_id) && <p className="mt-1 text-[14px] font-medium text-white/80">✈️ {trips.find((t) => t.id === m.trip_id)!.title}</p>}
              {m.description && <p className="mt-2 line-clamp-3 whitespace-pre-line text-[16px] leading-snug text-white/90">{m.description}</p>}
            </div>
          </section>
        ))}
      </div>

      {/* controls float over everything */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="glass pointer-events-auto rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink" aria-live="polite">
          {Math.min(current + 1, memories.length)} / {memories.length}
        </span>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={onGrid} aria-label="see all as a wall" className="glass flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink">▦</button>
          {here && <button type="button" onClick={() => onMore(here)} aria-label={`more options for ${here.title}`} className="glass flex h-11 w-11 items-center justify-center rounded-full text-ink"><span aria-hidden className="tracking-widest">•••</span></button>}
        </div>
      </div>

      {memories.length > 1 && !scrolled && (
        <div className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2" aria-hidden>
          <span className="glass flex h-11 w-11 animate-bounce items-center justify-center rounded-full text-lg text-ink">⌃</span>
        </div>
      )}
    </div>
  );
}
