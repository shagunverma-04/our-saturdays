"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { Chip, ErrorState, PillButton, Skeleton } from "@/components/ui/bits";
import { Icon3D } from "@/components/ui/Icon3D";
import { Sheet } from "@/components/ui/Sheet";
import { removeTrip } from "@/lib/store";
import { dateRangeLabel, TRIP_TABS, tripCountdown } from "@/lib/trips";
import { useShared } from "@/lib/useShared";
import { BudgetTab, ItineraryTab, ListTab, OverviewTab, TabPanel, TripMemoriesTab } from "./TripTabs";

export function TripScreen({ id }: { id: string }) {
  const router = useRouter();
  const { ready, trips } = useShared();
  const { openTrip, toast } = useAppUI();
  const [tab, setTab] = useState<string>("overview");
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const trip = trips.find((t) => t.id === id);

  const back = (
    <Link href="/trips" className="glass mt-[max(1rem,env(safe-area-inset-top))] inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold shadow-soft"><span aria-hidden>←</span> trips</Link>
  );

  if (!ready) return <main className="space-y-4">{back}<Skeleton className="h-40" /></main>;
  if (!trip) return <main className="space-y-6">{back}<ErrorState title="we can't find that trip" body="maybe it was removed." action={<PillButton onClick={() => router.push("/trips")}>back to trips</PillButton>} /></main>;

  return (
    <main className="mx-auto max-w-[640px] space-y-4">
      <div className="flex items-center justify-between">
        {back}
        <PillButton tone="glass" aria-label="trip options" className="mt-[max(1rem,env(safe-area-inset-top))] w-11 !px-0" onClick={() => setMenu(true)}><span aria-hidden className="tracking-widest">•••</span></PillButton>
      </div>

      <header className="flex items-center gap-4 px-1 pt-1">
        <Icon3D category="travel" className="h-16 w-16 shrink-0 drop-shadow-[0_6px_6px_rgba(0,0,0,0.2)]" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[34px] font-bold leading-none tracking-tight">{trip.title}</h1>
          <p className="mt-1.5 text-[15px] text-mute">{[trip.destination !== trip.title ? trip.destination : "", dateRangeLabel(trip), tripCountdown(trip)].filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="trip sections">
        {TRIP_TABS.map((t) => <Chip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Chip>)}
      </nav>

      <TabPanel>
        {tab === "overview" && <OverviewTab trip={trip} goto={setTab} />}
        {(tab === "place" || tab === "food" || tab === "stay" || tab === "activity") && <ListTab key={tab} trip={trip} type={tab} />}
        {tab === "itinerary" && <ItineraryTab trip={trip} editTrip={() => openTrip({ edit: trip })} />}
        {tab === "budget" && <BudgetTab key={trip.id} trip={trip} />}
        {tab === "memories" && <TripMemoriesTab trip={trip} />}
      </TabPanel>

      <Sheet open={menu} onClose={() => { setMenu(false); setConfirm(false); }} title="trip options">
        {confirm ? (
          <div className="pb-2 text-center">
            <p className="text-5xl" aria-hidden>🥺</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">remove &ldquo;{trip.title}&rdquo;?</h2>
            <p className="mt-1 text-mute">its lists, itinerary and budget go for both of you. memories stay, just untagged.</p>
            <div className="mt-6 flex gap-3">
              <PillButton tone="ghost" size="lg" className="flex-1" onClick={() => setConfirm(false)}>keep it</PillButton>
              <PillButton size="lg" className="flex-1 !bg-[#c4432b] !text-white" onClick={() => { removeTrip(trip.id); toast("trip removed", "🗑️"); router.replace("/trips"); }}>remove</PillButton>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 pb-2">
            <h2 className="mb-3 truncate font-display text-2xl font-bold tracking-tight">{trip.title}</h2>
            <button className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium shadow-soft" onClick={() => { setMenu(false); openTrip({ edit: trip }); }}><span aria-hidden>✏️</span> edit name, dates, budget</button>
            <button className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium text-[#c4432b] shadow-soft" onClick={() => setConfirm(true)}><span aria-hidden>🗑️</span> remove this trip</button>
          </div>
        )}
      </Sheet>
    </main>
  );
}
