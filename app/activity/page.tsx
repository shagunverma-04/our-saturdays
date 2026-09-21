"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FeedList } from "@/components/home/FeedList";
import { EmptyState, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { activityFeed } from "@/lib/activity";
import { useShared } from "@/lib/useShared";

export default function ActivityPage() {
  const { ready, items, interactions, profiles, meId, memories } = useShared();
  const feed = useMemo(() => activityFeed(items, interactions, profiles, meId, new Date(), 60, memories), [items, interactions, profiles, meId, memories]);

  return (
    <main className="mx-auto max-w-[560px]">
      <Link href="/" className="glass mt-[max(1rem,env(safe-area-inset-top))] inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold shadow-soft">
        <span aria-hidden>←</span> home
      </Link>
      <ScreenHeader title="lately" subtitle="what's been happening between us" />
      {!ready ? <Skeleton className="h-64" /> : feed.length === 0 ? <EmptyState emoji="🌱" title="nothing yet" body="save something, or react to their find. it'll show up here." /> : <FeedList events={feed} />}
    </main>
  );
}
