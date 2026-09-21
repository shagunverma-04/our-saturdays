import Link from "next/link";
import type { FeedEvent } from "@/lib/activity";
import { timeAgo } from "@/lib/utils";

/** Compact cards for what's happened between you. Used on Home (a few) and /activity (many). */
export function FeedList({ events }: { events: FeedEvent[] }) {
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id}>
          <Link href={e.href} className="flex items-center gap-3 rounded-[22px] bg-card px-4 py-3 shadow-soft active:scale-[0.99]">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-lg leading-none">{e.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium leading-snug">{e.text}</span>
              <span className="block text-xs text-mute">{timeAgo(e.at)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
