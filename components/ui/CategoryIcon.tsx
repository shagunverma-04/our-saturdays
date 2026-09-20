"use client";

import { motion } from "framer-motion";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { Icon3D } from "./Icon3D";
import type { CategoryId } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = { emoji: "✨", tint: "var(--t-all)", deep: "var(--d-all)" };

// each object sits at its own slight angle, like things set down on a table
const TILT: Record<CategoryId | "all", number> = { all: 0, places: -7, eat: 6, watch: -5, do: 7, shop: -6, travel: 5, ideas: -4 };

interface Props {
  category: CategoryId | "all";
  /** A tag-specific emoji (🍜, 🛶…). Omit — or pass the category's own emoji — to get the 3D icon. */
  emoji?: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  className?: string;
}

/**
 * lg/md: the object floats on its own with a soft ground shadow (no tile). The selected one gets a pool
 * of its category color behind it. sm: a small tile, since a bare 22px object gets lost in lists.
 */
export function CategoryIcon({ category, emoji, size = "md", selected, className }: Props) {
  const c = category === "all" ? ALL : CATEGORY_BY_ID[category];
  const native = emoji && emoji !== c.emoji ? emoji : null; // tag emoji override → keep the native glyph
  const tilt = TILT[category];

  if (size === "sm") {
    return (
      <span
        aria-hidden
        className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-lg leading-none", className)}
        style={{
          backgroundColor: c.tint,
          backgroundImage: "radial-gradient(120% 90% at 22% 12%, var(--tile-hi), transparent 62%)",
          boxShadow: "inset 0 0 0 1.5px var(--tile-edge)",
        }}
      >
        {native ? native : <Icon3D category={category} className="h-8 w-8 drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]" />}
      </span>
    );
  }

  const box = size === "lg" ? "h-[76px] w-[76px]" : "h-14 w-14";
  const glyph = size === "lg" ? "h-[64px] w-[64px] text-[46px]" : "h-12 w-12 text-[34px]";
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0 items-center justify-center", box, className)}>
      <span
        className={cn("absolute inset-1 rounded-full transition-all duration-300", selected ? "scale-110 opacity-100" : "scale-75 opacity-0")}
        style={{ backgroundColor: c.tint }}
      />
      <span className="absolute bottom-1 h-2.5 w-[55%] rounded-full bg-black/25 blur-[5px]" />
      {native ? (
        <span className={cn("relative flex items-center justify-center leading-none", glyph)} style={{ transform: `rotate(${tilt}deg)` }}>
          {native}
        </span>
      ) : (
        <Icon3D category={category} className={cn("relative select-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)]", glyph)} style={{ transform: `rotate(${tilt}deg)` }} />
      )}
    </span>
  );
}

interface PickerTileProps {
  category: CategoryId | "all";
  label: string;
  selected: boolean;
  onSelect: () => void;
  emoji?: string;
  disabled?: boolean;
  hint?: string;
}

/** Big tappable icon + label used by the category bar and the add sheet. */
export function CategoryTile({ category, label, selected, onSelect, emoji, disabled, hint }: PickerTileProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      whileTap={{ scale: 0.9 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className="group flex shrink-0 flex-col items-center gap-1 px-2.5 py-2 disabled:opacity-40"
    >
      <motion.span
        animate={selected ? { y: -3, scale: 1.08 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 14 }}
      >
        <CategoryIcon category={category} emoji={emoji} size="lg" selected={selected} />
      </motion.span>
      <span className={cn("text-[14px] tracking-tight", selected ? "font-bold text-ink" : "font-medium text-ink/55")}>{label}</span>
      {hint && <span className="-mt-1 text-[10px] text-mute">{hint}</span>}
    </motion.button>
  );
}
