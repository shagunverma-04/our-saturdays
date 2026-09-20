"use client";

import { EmptyState, PillButton, ScreenHeader } from "@/components/ui/bits";
import { useAppUI } from "@/components/ui/AppUI";

export default function TripsPage() {
  const { openAdd } = useAppUI();
  return (
    <main>
      <ScreenHeader title="trips" subtitle="little worlds we plan together" />
      <EmptyState
        emoji="🧳"
        title="where are we going next?"
        body="trip spaces (places, stay, itinerary, budget) are coming next. until then, save trip ideas."
        action={<PillButton onClick={() => openAdd({ category: "travel" })}>save a trip idea</PillButton>}
      />
    </main>
  );
}
