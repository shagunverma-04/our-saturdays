"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FindsRow } from "@/components/home/FindsRow";
import { Lately } from "@/components/home/Lately";
import { LittleMoment } from "@/components/home/LittleMoment";
import { MemoryPeek } from "@/components/home/MemoryPeek";
import { PasteLink } from "@/components/home/PasteLink";
import { PickForUs } from "@/components/home/PickForUs";
import { SaturdaySection } from "@/components/home/SaturdaySection";
import { Avatar, EmptyState, PillButton, Skeleton } from "@/components/ui/bits";
import { useAppUI } from "@/components/ui/AppUI";
import { greeting } from "@/lib/greeting";
import { useShared } from "@/lib/useShared";

const RECENT = (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at);

export default function HomePage() {
  const { ready, error, items, me, meId, partner } = useShared();
  const { openAdd } = useAppUI();
  const hello = useMemo(() => greeting(), []);

  const open = items.filter((i) => i.status !== "done" && i.status !== "archived");
  const fromMe = open.filter((i) => i.created_by === meId).sort(RECENT).slice(0, 6);
  const fromThem = open.filter((i) => i.created_by !== meId).sort(RECENT).slice(0, 6);

  return (
    <main>
      <header className="flex items-start justify-between px-1 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div>
          <h1 className="font-display text-[40px] font-bold leading-none tracking-tight">
            our saturdays<span className="text-sun">.</span>
          </h1>
          <p className="mt-2 text-[15px] text-mute">{ready ? hello : "what are we doing this week?"}</p>
        </div>
        <Link href="/us" aria-label={`us — signed in as ${me?.name ?? "you"}`} className="mt-1">
          <Avatar profile={me ?? { name: "you", avatar: "🙂" }} size={44} />
        </Link>
      </header>

      {error && <p className="mb-4 rounded-2xl bg-sun/40 px-4 py-3 text-sm">{error}</p>}

      {!ready ? (
        <div className="space-y-6">
          <Skeleton className="h-[360px] !rounded-[36px]" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          <div className="space-y-4 lg:order-1">
            <div className="flex px-1"><PasteLink /></div>
            <SaturdaySection />
          </div>
          <div className="lg:order-3 lg:col-span-2 space-y-6">
            {items.length === 0 && (
              <EmptyState emoji="🌤️" title="nothing saved yet" body="see something you'd love to do together? save it, and it shows up for both of you." action={<PillButton onClick={() => openAdd()}>save the first thing</PillButton>} />
            )}
            <FindsRow title="from you" items={fromMe} />
            <FindsRow title={partner ? `from ${partner.name}` : "from them"} items={fromThem} />
          </div>
          <div className="space-y-8 lg:order-2">
            <MemoryPeek />
            <PickForUs />
            <Lately />
            <LittleMoment />
          </div>
        </div>
      )}
    </main>
  );
}
