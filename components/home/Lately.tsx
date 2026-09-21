"use client";

import Link from "next/link";
import { useMemo } from "react";
import { activityFeed } from "@/lib/activity";
import { insights, lately } from "@/lib/insights";
import { useShared } from "@/lib/useShared";
import { FeedList } from "./FeedList";

/** "lately": one true sentence about your week, a couple of honest observations, and the last few moments. */
export function Lately() {
  const { items, interactions, profiles, meId, sig, memories } = useShared();

  const { line, notes, feed } = useMemo(() => {
    const mutual = items.filter((i) => sig(i).mutual && i.status !== "done" && i.status !== "archived");
    return {
      line: lately(items),
      notes: insights(items, mutual),
      feed: activityFeed(items, interactions, profiles, meId, new Date(), 3, memories),
    };
  }, [items, interactions, profiles, meId, sig, memories]);

  if (!line && notes.length === 0 && feed.length === 0) return null;

  return (
    <section aria-labelledby="lately-h" className="space-y-3">
      <h2 id="lately-h" className="px-1 font-display text-2xl font-bold tracking-tight">lately</h2>
      {(line || notes.length > 0) && (
        <div className="rounded-[28px] bg-card p-5 shadow-soft">
          {line && <p className="font-display text-[19px] font-semibold leading-snug tracking-tight">{line}</p>}
          {notes.map((n) => (
            <p key={n} className="mt-2 text-[15px] text-ink/70">{n}</p>
          ))}
        </div>
      )}
      {feed.length > 0 && <FeedList events={feed} />}
      <Link href="/activity" className="inline-block px-1 py-2 text-sm font-semibold text-mute">see everything →</Link>
    </section>
  );
}
