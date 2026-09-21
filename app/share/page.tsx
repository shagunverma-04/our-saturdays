"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PillButton, ScreenHeader, SourceChip } from "@/components/ui/bits";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { captureLink, extractUrl } from "@/lib/capture";
import { updateItem, useStore } from "@/lib/store";
import type { SavedItem } from "@/lib/types";

type Phase = "waiting" | "saved" | "duplicate" | "nolink";

/**
 * Where "Share → our saturdays" lands (Android PWA share target, or an iPhone Shortcut that opens
 * /share?url=…). It saves immediately — the point is that nobody fills in a form.
 */
export default function SharePage() {
  const router = useRouter();
  const { ready, items } = useStore();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [manual, setManual] = useState("");
  const done = useRef(false);

  const saveUrl = (url: string) => {
    const { item, duplicate } = captureLink(url);
    setId(item.id);
    setPhase(duplicate ? "duplicate" : "saved");
  };

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const q = new URLSearchParams(window.location.search);
    const url = extractUrl(q.get("url"), q.get("text"), q.get("title"));
    // deferred a tick so the save (which touches the store) isn't a synchronous state update inside the effect
    void Promise.resolve().then(() => (url ? saveUrl(url) : setPhase("nolink")));
  }, [ready]);

  // the real title arrives a moment later (link preview) — show it without clobbering what you're typing
  const live = id ? items.find((i: SavedItem) => i.id === id) : undefined;
  const shownTitle = live && title === "" ? live.title : title;

  return (
    <main className="mx-auto max-w-[460px]">
      <ScreenHeader title="saved ✨" subtitle="it's on both your phones" />
      {phase === "waiting" && <p className="px-1 text-mute">saving…</p>}

      {(phase === "saved" || phase === "duplicate") && live && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-[28px] bg-card p-4 shadow-soft">
            <CategoryIcon category={live.category} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-mute">{phase === "duplicate" ? "already on our list 👀" : "just saved"}</p>
              <p className="truncate font-display text-xl font-bold tracking-tight">{live.title}</p>
              <SourceChip url={live.source_url} saved className="mt-1.5" />
            </div>
          </div>
          <label className="block">
            <span className="mb-2 ml-2 block text-sm font-semibold text-mute">give it a better name? (optional)</span>
            <input
              value={shownTitle}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={(e) => {
                const v = e.currentTarget.value.trim(); // read from the field itself: never stale
                if (id && v && v !== live.title) updateItem(id, { title: v });
              }}
              className="h-14 w-full rounded-[20px] bg-card px-4 shadow-soft outline-none focus:ring-2 focus:ring-ink/20"
            />
          </label>
          <div className="flex gap-3">
            <PillButton size="lg" className="flex-1" onClick={() => router.replace("/")}>done</PillButton>
            <PillButton size="lg" tone="ghost" onClick={() => router.replace(`/later/${live.id}`)}>open</PillButton>
          </div>
        </div>
      )}

      {phase === "nolink" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const url = extractUrl(manual) ?? (manual.includes(".") ? manual.trim() : null);
            if (url) saveUrl(url);
          }}
        >
          <p className="px-1 text-[15px] text-mute">no link came through. paste one here:</p>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="none" className="h-14 w-full rounded-[20px] bg-card px-4 shadow-soft outline-none focus:ring-2 focus:ring-ink/20" aria-label="link" />
          <PillButton type="submit" size="lg" className="w-full" disabled={!manual.trim()}>save it</PillButton>
        </form>
      )}
    </main>
  );
}
