"use client";

import type { ReactNode } from "react";
import { PillButton } from "@/components/ui/bits";
import { refreshSession, signOut, useSession } from "@/lib/session";
import { AuthScreen } from "./AuthScreen";
import { Onboarding } from "./Onboarding";
import { AuthShell } from "./AuthShell";

/** Nothing private renders until you're signed in AND part of a couple. (Data is also protected by RLS in the database.) */
export function AppGate({ children }: { children: ReactNode }) {
  const s = useSession();
  switch (s.status) {
    case "local":
    case "ready":
      return <>{children}</>;
    case "loading":
      return (
        <AuthShell>
          <p className="floaty text-center text-4xl" aria-label="loading">🗝️</p>
        </AuthShell>
      );
    case "signedOut":
      return <AuthScreen />;
    case "noCouple":
      return <Onboarding />;
    case "error":
      return (
        <AuthShell>
          <div className="rounded-[28px] bg-card p-6 text-center shadow-soft">
            <p className="text-4xl" aria-hidden>🫠</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">couldn&apos;t reach our space</h2>
            <p className="mt-1 text-[15px] text-mute">{s.error}</p>
            <div className="mt-5 flex justify-center gap-2">
              <PillButton onClick={() => void refreshSession()}>try again</PillButton>
              <PillButton tone="ghost" onClick={() => void signOut()}>sign out</PillButton>
            </div>
          </div>
        </AuthShell>
      );
  }
}
