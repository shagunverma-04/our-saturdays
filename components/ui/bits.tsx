"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useState, type ReactNode } from "react";
import { sourceInfo, sourceWord, cn } from "@/lib/utils";
import { useMediaUrl } from "@/lib/media";
import type { Profile } from "@/lib/types";

type Tone = "ink" | "glass" | "sun" | "ghost";

const TONES: Record<Tone, string> = {
  ink: "bg-ink text-on-ink",
  glass: "glass text-ink shadow-soft",
  sun: "bg-sun text-[#1c1c1a]",
  ghost: "bg-ink/[0.06] text-ink",
};

interface PillButtonProps extends HTMLMotionProps<"button"> {
  tone?: Tone;
  size?: "md" | "lg";
}

/** The one button shape in the app: a springy pill. */
export function PillButton({ tone = "ink", size = "md", className, children, ...rest }: PillButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight disabled:opacity-40",
        size === "lg" ? "h-14 px-7 text-base" : "h-11 px-5 text-[15px]",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.94 }}
      className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-medium", active ? "bg-ink text-on-ink" : "bg-card text-ink/70 shadow-soft", className)}
    >
      {children}
    </motion.button>
  );
}

export function SourceChip({ url, className, saved }: { url: string; className?: string; saved?: boolean }) {
  const s = sourceInfo(url);
  if (!s) return null;
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs font-medium text-ink/70", className)}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.dot }} />
      <span className="truncate">{saved ? `saved from ${sourceWord(url)}` : s.label}</span>
    </span>
  );
}

export function Avatar({ profile, size = 32 }: { profile: Pick<Profile, "name" | "avatar"> & { photo?: string }; size?: number }) {
  const src = useMediaUrl(profile.photo ?? "");
  const [failed, setFailed] = useState("");
  const photo = src && failed !== src ? src : "";
  return (
    <span
      role="img"
      aria-label={profile.name}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card leading-none shadow-soft"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
      ) : (
        profile.avatar
      )}
    </span>
  );
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] bg-card px-6 py-10 text-center shadow-soft">
      <span className="floaty text-5xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{title}</h3>
      {body && <p className="mt-1 max-w-[26ch] text-[15px] text-mute">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "that didn't work", body, action }: { title?: string; body?: string; action?: ReactNode }) {
  return <EmptyState emoji="🫠" title={title} body={body} action={action} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-[28px]", className)} />;
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 px-1 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div>
        <h1 className="font-display text-[40px] font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-mute">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
