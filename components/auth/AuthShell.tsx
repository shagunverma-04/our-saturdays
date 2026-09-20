import type { ReactNode } from "react";
import { MapBackdrop } from "@/components/ui/MapBackdrop";

/** Shared frame for every pre-app screen: the map card, the wordmark, room for one card of content. */
export function AuthShell({ children, pin = "🗝️" }: { children: ReactNode; pin?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center gap-6 px-4 py-10">
      <div className="relative h-[170px] overflow-hidden rounded-[36px] shadow-float" aria-hidden>
        <MapBackdrop />
        <div className="floaty absolute inset-x-0 top-6 flex flex-col items-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-3xl shadow-float">{pin}</span>
          <span className="-mt-1 h-3 w-3 rotate-45 rounded-[2px] bg-ink" />
        </div>
      </div>
      <header className="px-1">
        <h1 className="font-display text-[40px] font-bold leading-none tracking-tight">
          our saturdays<span className="text-sun">.</span>
        </h1>
        <p className="mt-2 text-[15px] text-mute">things we want to do together.</p>
      </header>
      {children}
    </main>
  );
}
