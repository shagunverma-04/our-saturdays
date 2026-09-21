"use client";

import { useState } from "react";
import { GuessTab } from "@/components/games/GuessTab";
import { RememberTab } from "@/components/games/RememberTab";
import { WhoTab } from "@/components/games/WhoTab";
import { Chip, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { useShared } from "@/lib/useShared";

type Tab = "guess" | "who" | "remember";

export default function GamesPage() {
  const { ready } = useShared();
  const [tab, setTab] = useState<Tab>(() => {
    const t = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    return t === "who" || t === "remember" ? t : "guess";
  });

  return (
    <main className="mx-auto max-w-[560px]">
      <ScreenHeader title="games" subtitle="tiny things, just us" />
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="games">
        <Chip active={tab === "guess"} onClick={() => setTab("guess")}>🔤 guess the word</Chip>
        <Chip active={tab === "who"} onClick={() => setTab("who")}>🕵️ who saved this?</Chip>
        <Chip active={tab === "remember"} onClick={() => setTab("remember")}>📷 remember when?</Chip>
      </div>
      {!ready ? <Skeleton className="h-64" /> : tab === "guess" ? <GuessTab /> : tab === "who" ? <WhoTab key="who" /> : <RememberTab key="remember" />}
    </main>
  );
}
