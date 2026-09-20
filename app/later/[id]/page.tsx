"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ItemMenu } from "@/components/later/ItemMenu";
import { useItemActions } from "@/components/later/useItemActions";
import { Avatar, Chip, ErrorState, PillButton, Skeleton, SourceChip } from "@/components/ui/bits";
import { ItemArt } from "@/components/ui/ItemArt";
import { CATEGORY_BY_ID, STATUSES } from "@/lib/categories";
import { updateItem, useItem, useStore } from "@/lib/store";
import { countdown, friendlyDay, mapsSearchUrl, timeAgo } from "@/lib/utils";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { item, ready } = useItem(id);
  const { profiles } = useStore();
  const a = useItemActions();
  const [menu, setMenu] = useState(false);

  const back = (
    <Link href="/later" className="glass mt-[max(1rem,env(safe-area-inset-top))] inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold shadow-soft">
      <span aria-hidden>←</span> later
    </Link>
  );

  if (!ready) {
    return (
      <main className="space-y-4">
        {back}
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="h-24" />
      </main>
    );
  }

  if (!item) {
    return (
      <main className="space-y-6">
        {back}
        <ErrorState title="we can't find that one" body="maybe it was removed." action={<PillButton onClick={() => router.push("/later")}>back to our list</PillButton>} />
      </main>
    );
  }

  const cat = CATEGORY_BY_ID[item.category];
  const by = profiles.find((p) => p.id === item.created_by) ?? profiles[0];

  return (
    <main className="mx-auto max-w-[640px] space-y-5 pb-4">
      <div className="flex items-center justify-between">
        {back}
        <PillButton tone="glass" aria-label="more options" className="mt-[max(1rem,env(safe-area-inset-top))] w-11 !px-0" onClick={() => setMenu(true)}>
          <span aria-hidden className="tracking-widest">•••</span>
        </PillButton>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="aspect-[4/3] overflow-hidden rounded-card shadow-soft">
        <ItemArt item={item} priority emojiClass="text-[120px]" />
      </motion.div>

      <div className="px-1">
        <p className="text-sm font-semibold text-mute">
          {cat.emoji} {cat.label}
        </p>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-[1.05] tracking-tight">{item.title}</h1>
        {item.description && <p className="mt-2 text-[17px] text-ink/70">{item.description}</p>}
      </div>

      <section aria-label="status" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STATUSES.map((s) => (
          <Chip key={s.id} active={item.status === s.id} onClick={() => item.status !== s.id && a.changeStatus(item, s.id)}>
            {s.label}
          </Chip>
        ))}
      </section>

      <section className="divide-y divide-line overflow-hidden rounded-card bg-card shadow-soft">
        {item.location_name && (
          <Row label="where">
            <a href={mapsSearchUrl(item.location_name)} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-ink/20 underline-offset-4">
              📍 {item.location_name} ↗
            </a>
          </Row>
        )}
        {item.release_date && (
          <Row label="when">
            <span className="font-medium">
              {friendlyDay(item.release_date)} <span className="text-mute">· {countdown(item.release_date)}</span>
            </span>
          </Row>
        )}
        {item.source_url && (
          <Row label="from">
            <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-medium">
              <SourceChip url={item.source_url} /> <span className="underline decoration-ink/20 underline-offset-4">view original ↗</span>
            </a>
          </Row>
        )}
        <Row label="saved by">
          <span className="flex items-center gap-2 font-medium">
            <Avatar profile={by} size={26} /> {by.name} <span className="font-normal text-mute">· {timeAgo(item.created_at)}</span>
          </span>
        </Row>
        {item.tags.length > 0 && (
          <Row label="tags">
            <span className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span key={t} className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-xs font-medium">
                  #{t}
                </span>
              ))}
            </span>
          </Row>
        )}
      </section>

      <NotesBox key={item.id} id={item.id} saved={item.notes} />

      <div className="flex gap-3">
        {item.status === "done" || item.status === "planned" ? (
          item.status === "planned" ? (
            <PillButton size="lg" className="flex-1" onClick={() => a.changeStatus(item, "done")}>we did it 🎉</PillButton>
          ) : (
            <PillButton size="lg" tone="ghost" className="flex-1" onClick={() => a.changeStatus(item, "saved")}>do it again?</PillButton>
          )
        ) : (
          <PillButton size="lg" className="flex-1" onClick={() => a.letsGo(item)}>let&apos;s go</PillButton>
        )}
        <PillButton size="lg" tone="ghost" onClick={() => a.edit(item)}>edit</PillButton>
      </div>

      <ItemMenu item={menu ? item : null} onClose={() => setMenu(false)} onRemoved={() => router.replace("/later")} />
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 text-[15px]">
      <span className="w-16 shrink-0 text-mute">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Notes save when you tap away. Keyed by item id so it re-initialises per item. */
function NotesBox({ id, saved }: { id: string; saved: string }) {
  const [notes, setNotes] = useState(saved);
  return (
    <label className="block">
      <span className="mb-2 ml-2 block text-sm font-semibold text-mute">our notes</span>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== saved && updateItem(id, { notes })}
        rows={3}
        placeholder="anything to remember? (booking, timings, who's driving…)"
        className="w-full resize-none rounded-[24px] bg-card p-4 shadow-soft outline-none placeholder:text-mute/80 focus:ring-2 focus:ring-ink/20"
      />
    </label>
  );
}
