"use client";

import Link from "next/link";
import { LittleMoment } from "@/components/home/LittleMoment";
import { NextSaturday } from "@/components/home/NextSaturday";
import { PickForUs } from "@/components/home/PickForUs";
import { RecentlySaved } from "@/components/home/RecentlySaved";
import { ThisWeek } from "@/components/home/ThisWeek";
import { Avatar, Skeleton } from "@/components/ui/bits";
import { useMe, useStore } from "@/lib/store";

export default function HomePage() {
  const { ready, error } = useStore();
  const me = useMe();

  return (
    <main>
      <header className="flex items-start justify-between px-1 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div>
          <h1 className="font-display text-[40px] font-bold leading-none tracking-tight">
            our saturdays<span className="text-sun">.</span>
          </h1>
          <p className="mt-2 text-[15px] text-mute">what are we doing this week?</p>
        </div>
        <Link href="/us" aria-label={`us — signed in as ${me.name}`} className="mt-1">
          <Avatar profile={me} size={44} />
        </Link>
      </header>

      {error && <p className="mb-4 rounded-2xl bg-sun/40 px-4 py-3 text-sm">{error}</p>}

      {!ready ? (
        <div className="space-y-6">
          <Skeleton className="h-[320px] !rounded-[36px]" />
          <Skeleton className="h-48" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          <div className="lg:order-1"><NextSaturday /></div>
          <div className="lg:order-3 lg:col-span-2"><RecentlySaved /></div>
          <div className="lg:order-2"><ThisWeek /></div>
          <div className="lg:order-4"><PickForUs /></div>
          <div className="lg:order-5"><LittleMoment /></div>
        </div>
      )}
    </main>
  );
}
