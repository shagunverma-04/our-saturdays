"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { CATEGORY_BY_ID, itemEmoji } from "@/lib/categories";
import type { SavedItem } from "@/lib/types";
import { useMediaUrl } from "@/lib/media";
import { cn, hash } from "@/lib/utils";

interface Props {
  item: Pick<SavedItem, "id" | "title" | "category" | "tags" | "image_url">;
  className?: string;
  emojiClass?: string;
  priority?: boolean;
}

/** Item image, or a small illustration (pastel field, dots, big object) when there's no photo. */
export function ItemArt({ item, className, emojiClass = "text-6xl", priority }: Props) {
  const c = CATEGORY_BY_ID[item.category];
  const src = useMediaUrl(item.image_url);
  const [failed, setFailed] = useState("");
  // while a private photo's signed link is being fetched (or if it fails to load), the illustration shows instead
  if (src && failed !== src) {
    return (
      <img
        src={src}
        alt={item.title}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  const h = hash(item.id);
  const tilt = ((h % 13) - 6) * 1.2;
  const blob = 30 + (h % 30);
  return (
    <div className={cn("dots relative flex h-full w-full items-center justify-center overflow-hidden", className)} style={{ backgroundColor: c.tint }} role="img" aria-label={item.title}>
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{ width: `${blob + 40}%`, aspectRatio: "1", background: c.deep, opacity: 0.35, left: `${(h % 40) - 20}%`, top: `${((h >> 3) % 40) - 30}%` }}
      />
      <span aria-hidden className={cn("relative leading-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.14)]", emojiClass)} style={{ transform: `rotate(${tilt}deg)` }}>
        {itemEmoji(item)}
      </span>
    </div>
  );
}
