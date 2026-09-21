"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { SavedItem } from "@/lib/types";
import { useMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

interface Props {
  item: Pick<SavedItem, "title" | "image_url">;
  className?: string;
  priority?: boolean;
}

/**
 * An item's photo. Only render this when the item HAS a photo (`item.image_url`): things without one get a
 * text-first layout instead of a placeholder picture. While a private photo's link is loading (or if it
 * fails to load) this shows a quiet neutral block, never an illustration.
 */
export function ItemArt({ item, className, priority }: Props) {
  const src = useMediaUrl(item.image_url);
  const [failed, setFailed] = useState("");
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
  return <div className={cn("skeleton h-full w-full !rounded-none", className)} role="img" aria-label={item.title} />;
}
