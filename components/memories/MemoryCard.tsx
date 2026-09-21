"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { useMediaUrl } from "@/lib/media";
import type { Memory } from "@/lib/types";
import { hash, shortDate } from "@/lib/utils";

// varied heights give the wall its rhythm; picked per memory so nothing jumps while photos load
const RATIOS = ["4 / 5", "1 / 1", "3 / 4", "5 / 4"];
const OBJECTS = ["☕", "🎞️", "🌇", "🍃", "🌸", "🎈", "🍰", "🎧"]; // all long-supported, so none renders blank on an older phone

/** A memory's cover: its first photo, or (when it has none yet) a little pastel illustration. */
export function MemoryCover({ memory, className, ratio, fill, emojiClass = "text-5xl" }: { memory: Memory; className?: string; ratio?: string; fill?: boolean; emojiClass?: string }) {
  const src = useMediaUrl(memory.photos[0] ?? "");
  const [failed, setFailed] = useState("");
  const h = hash(memory.id);
  const tint = CATEGORIES[h % CATEGORIES.length];
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={fill ? undefined : { aspectRatio: ratio ?? RATIOS[h % RATIOS.length] }}>
      {src && failed !== src ? (
        <img src={src} alt={memory.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="dots absolute inset-0 flex items-center justify-center" style={{ backgroundColor: tint.tint }} role="img" aria-label={memory.title}>
          <span aria-hidden className={`${emojiClass} drop-shadow-[0_6px_6px_rgba(0,0,0,0.14)]`} style={{ transform: `rotate(${((h >>> 3) % 13) - 6}deg)` }}>
            {OBJECTS[(h >>> 5) % OBJECTS.length]}
          </span>
        </div>
      )}
      {memory.photos.length > 1 && <span className="glass absolute right-2 top-2 rounded-full px-2 py-1 text-[11px] font-semibold">{memory.photos.length} 📷</span>}
    </div>
  );
}

export function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <Link href={`/memories/${memory.id}`} className="mb-3 block break-inside-avoid overflow-hidden rounded-[24px] bg-card shadow-soft active:scale-[0.98]">
      <MemoryCover memory={memory} />
      <div className="px-3.5 pb-3.5 pt-3">
        <p className="font-display text-[17px] font-semibold leading-tight tracking-tight">{memory.title}</p>
        <p className="mt-0.5 truncate text-xs text-mute">
          {shortDate(memory.date)}
          {memory.location ? ` · ${memory.location.split(",")[0]}` : ""}
        </p>
      </div>
    </Link>
  );
}
