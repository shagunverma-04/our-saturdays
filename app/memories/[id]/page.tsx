"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { MemoryCover } from "@/components/memories/MemoryCard";
import { useAppUI } from "@/components/ui/AppUI";
import { Avatar, ErrorState, PillButton, Skeleton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { longDate, howLongAgo } from "@/lib/memories";
import { useMediaUrl } from "@/lib/media";
import { removeMemory, useStore } from "@/lib/store";
import { mapsSearchUrl } from "@/lib/utils";

function Photo({ photoRef, alt, onOpen }: { photoRef: string; alt: string; onOpen: (src: string) => void }) {
  const src = useMediaUrl(photoRef);
  if (!src) return <div className="skeleton mb-3 aspect-[4/5] !rounded-[22px]" />;
  return (
    <button type="button" onClick={() => onOpen(src)} className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-[22px] shadow-soft" aria-label={`view photo: ${alt}`}>
      <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-auto w-full" />
    </button>
  );
}

export default function MemoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, memories, items, profiles } = useStore();
  const { openMemory } = useAppUI();
  const [viewer, setViewer] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const m = memories.find((x) => x.id === id);

  const back = (
    <Link href="/memories" className="glass mt-[max(1rem,env(safe-area-inset-top))] inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold shadow-soft">
      <span aria-hidden>←</span> memories
    </Link>
  );

  if (!ready) return <main className="space-y-4">{back}<Skeleton className="aspect-[4/5]" /></main>;
  if (!m) return <main className="space-y-6">{back}<ErrorState title="we can't find that memory" body="maybe it was removed." action={<PillButton onClick={() => router.push("/memories")}>back to the wall</PillButton>} /></main>;

  const by = profiles.find((p) => p.id === m.created_by);
  const item = m.saved_item_id ? items.find((i) => i.id === m.saved_item_id) : undefined;

  return (
    <main className="mx-auto max-w-[680px] space-y-5 pb-4">
      <div className="flex items-center justify-between">
        {back}
        <PillButton tone="glass" className="mt-[max(1rem,env(safe-area-inset-top))]" onClick={() => openMemory({ edit: m })}>edit</PillButton>
      </div>

      {m.photos.length === 0 ? (
        <MemoryCover memory={m} ratio="4 / 3" className="rounded-card shadow-soft" />
      ) : m.photos.length === 1 ? (
        <Photo photoRef={m.photos[0]} alt={m.title} onOpen={setViewer} />
      ) : (
        <div className="columns-2 gap-3">
          {m.photos.map((p) => (
            <Photo key={p} photoRef={p} alt={m.title} onOpen={setViewer} />
          ))}
        </div>
      )}

      <div className="px-1">
        <p className="text-sm font-semibold text-mute">{longDate(m.date)} · {howLongAgo(m.date)}</p>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-[1.05] tracking-tight">{m.title}</h1>
        {m.description && <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed text-ink/80">{m.description}</p>}
      </div>

      <section className="divide-y divide-line overflow-hidden rounded-card bg-card shadow-soft">
        {m.location && (
          <div className="flex items-center gap-4 px-5 py-4 text-[15px]">
            <span className="w-16 shrink-0 text-mute">where</span>
            <a href={mapsSearchUrl(m.location)} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-ink/20 underline-offset-4">📍 {m.location} ↗</a>
          </div>
        )}
        {item && (
          <div className="flex items-center gap-4 px-5 py-4 text-[15px]">
            <span className="w-16 shrink-0 text-mute">from</span>
            <Link href={`/later/${item.id}`} className="font-medium underline decoration-ink/20 underline-offset-4">{item.title} →</Link>
          </div>
        )}
        {by && (
          <div className="flex items-center gap-4 px-5 py-4 text-[15px]">
            <span className="w-16 shrink-0 text-mute">kept by</span>
            <span className="flex items-center gap-2 font-medium"><Avatar profile={by} size={26} /> {by.name}</span>
          </div>
        )}
      </section>

      <PillButton tone="ghost" className="!text-[#c4432b]" onClick={() => setConfirm(true)}>remove this memory</PillButton>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="remove memory">
        <div className="pb-2 text-center">
          <p className="text-5xl" aria-hidden>🥺</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">remove &ldquo;{m.title}&rdquo;?</h2>
          <p className="mt-1 text-mute">its photos go too, for both of you. this can&apos;t be undone.</p>
          <div className="mt-6 flex gap-3">
            <PillButton tone="ghost" size="lg" className="flex-1" onClick={() => setConfirm(false)}>keep it</PillButton>
            <PillButton size="lg" className="flex-1 !bg-[#c4432b] !text-white" onClick={() => { removeMemory(m.id); router.replace("/memories"); }}>remove</PillButton>
          </div>
        </div>
      </Sheet>

      <AnimatePresence>
        {viewer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3" onClick={() => setViewer(null)} role="dialog" aria-modal="true" aria-label="photo">
            <img src={viewer} alt={m.title} className="max-h-full max-w-full rounded-2xl object-contain" />
            <button type="button" aria-label="close photo" className="glass absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full text-lg" onClick={() => setViewer(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
