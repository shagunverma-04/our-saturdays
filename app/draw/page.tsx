"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { DrawingBoard } from "@/components/draw/DrawingBoard";
import { DrawingImage } from "@/components/draw/DrawingImage";
import { Avatar, Chip, EmptyState, PillButton, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { markDrawingSeen, removeDrawing } from "@/lib/store";
import { useShared } from "@/lib/useShared";
import { timeAgo } from "@/lib/utils";

export default function DrawPage() {
  const { ready, drawings, profiles, meId } = useShared();
  const [tab, setTab] = useState<"draw" | "ours">(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("open") ? "ours" : "draw"));
  const [openId, setOpenId] = useState<string | null>(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("open") : null));
  const [confirm, setConfirm] = useState(false);
  const open = drawings.find((d) => d.id === openId);
  const who = (id: string) => profiles.find((p) => p.id === id);

  const show = (id: string) => {
    setOpenId(id);
    markDrawingSeen(id);
  };

  return (
    <main className="mx-auto max-w-[640px]">
      <ScreenHeader title="draw" subtitle="little doodles, just for us" />
      <div className="mb-4 flex gap-2" role="tablist" aria-label="drawing board or gallery">
        <Chip active={tab === "draw"} onClick={() => setTab("draw")}>✏️ draw</Chip>
        <Chip active={tab === "ours"} onClick={() => setTab("ours")}>🖼️ ours {ready && drawings.length > 0 && <span className="opacity-60">{drawings.length}</span>}</Chip>
      </div>

      {!ready ? (
        <Skeleton className="h-96" />
      ) : tab === "draw" ? (
        <DrawingBoard onSent={() => setTab("ours")} />
      ) : drawings.length === 0 ? (
        <EmptyState emoji="🎨" title="no drawings yet" body="draw something silly and send it over." action={<PillButton onClick={() => setTab("draw")}>start drawing</PillButton>} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {drawings.map((d) => {
            const artist = who(d.created_by);
            const isNew = d.created_by !== meId && !d.seen_by.includes(meId);
            return (
              <button key={d.id} type="button" onClick={() => show(d.id)} className="relative overflow-hidden rounded-[24px] bg-card text-left shadow-soft active:scale-[0.98]" aria-label={`open drawing by ${artist?.name ?? "someone"}${isNew ? " (new)" : ""}`}>
                <div className="aspect-[4/5] w-full"><DrawingImage image={d.image} alt={d.caption || `drawing by ${artist?.name ?? "someone"}`} className="h-full w-full object-cover" /></div>
                {isNew && <span className="absolute left-2 top-2 rounded-full bg-sun px-2.5 py-1 text-[11px] font-bold text-[#1c1c1a]">new</span>}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {artist && <Avatar profile={artist} size={22} />}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-mute">{d.created_by === meId ? "you" : artist?.name} · {timeAgo(d.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="drawing" onClick={() => { setOpenId(null); setConfirm(false); }}>
            <div className="w-full max-w-[520px] overflow-hidden rounded-[28px] shadow-float" onClick={(e) => e.stopPropagation()}>
              <DrawingImage image={open.image} alt={open.caption || "a drawing"} className="block w-full" />
            </div>
            <div className="mt-4 w-full max-w-[520px] text-center text-white" onClick={(e) => e.stopPropagation()}>
              {open.caption && <p className="font-display text-xl font-semibold">{open.caption}</p>}
              <p className="mt-1 text-sm text-white/70">{open.created_by === meId ? "you" : who(open.created_by)?.name} · {timeAgo(open.created_at)}</p>
              {open.created_by === meId && (
                <div className="mt-3 flex justify-center gap-2">
                  {confirm ? (
                    <>
                      <PillButton tone="glass" onClick={() => setConfirm(false)}>keep it</PillButton>
                      <PillButton className="!bg-[#c4432b] !text-white" onClick={() => { removeDrawing(open.id); setOpenId(null); setConfirm(false); }}>delete for both</PillButton>
                    </>
                  ) : (
                    <PillButton tone="glass" onClick={() => setConfirm(true)}>delete</PillButton>
                  )}
                </div>
              )}
            </div>
            <button type="button" aria-label="close" onClick={() => { setOpenId(null); setConfirm(false); }} className="glass absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full text-lg">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
