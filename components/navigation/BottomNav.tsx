"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { cn } from "@/lib/utils";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Icons: Record<string, ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
      <path d="M4 11.2 12 4l8 7.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  later: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.6L6 20V5a1 1 0 0 1 1-1z" />
    </svg>
  ),
  trips: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2M4 13h16" />
    </svg>
  ),
  memories: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 17 5-4.5 3.5 3L15 13l5 4.5" />
    </svg>
  ),
  us: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="16.5" cy="10.5" r="2.5" />
      <path d="M3.5 19c.5-3 2.8-4.8 5.5-4.8s5 1.8 5.5 4.8M15 14.6c2.6-.3 4.9 1.1 5.5 4" />
    </svg>
  ),
};

const NAV = [
  { href: "/", label: "home", icon: "home" },
  { href: "/later", label: "later", icon: "later" },
  { href: "/trips", label: "trips", icon: "trips" },
  { href: "/memories", label: "memories", icon: "memories" },
  { href: "/us", label: "us", icon: "us" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { openAdd, pickMemoryPhotos } = useAppUI();
  // on the memories screens, + means "add photos" straight away, not the save-a-find sheet
  const onMemories = pathname === "/memories" || pathname.startsWith("/memories/");

  // detail pages keep "later" lit
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-none flex w-full max-w-[460px] justify-end pr-1">
          <motion.button
            type="button"
            aria-label={onMemories ? "add photos" : "add something"}
            onClick={() => (onMemories ? pickMemoryPhotos() : openAdd())}
            whileTap={{ scale: 0.88, rotate: 90 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink text-on-ink shadow-float"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </motion.button>
        </div>

        <nav aria-label="main" className="glass pointer-events-auto flex w-full max-w-[460px] items-center justify-between rounded-full p-1.5 shadow-float">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium", active ? "text-on-ink" : "text-ink/55")}
              >
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
                )}
                <motion.span className="relative" animate={active ? { y: -1, scale: 1.06 } : { y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                  {Icons[n.icon]}
                </motion.span>
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
