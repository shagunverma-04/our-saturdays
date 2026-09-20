"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { itemEmoji } from "@/lib/categories";
import { useStore } from "@/lib/store";
import type { CategoryId } from "@/lib/types";
import { daysSince, daysUntil, friendlyDay } from "@/lib/utils";

interface Entry {
  key: string;
  href: string;
  category: CategoryId;
  emoji: string;
  title: string;
  sub: string;
  sort: number;
}

const VERB: Record<CategoryId, string> = { watch: "releasing", do: "coming up", travel: "trip", places: "on", eat: "reserved for", shop: "by", ideas: "by" };

export function ThisWeek() {
  const { items, plans } = useStore();

  const entries = useMemo(() => {
    const out: Entry[] = [];
    const seen = new Set<string>();
    for (const p of plans) {
      const n = daysUntil(p.date);
      const it = items.find((i) => i.id === p.saved_item_id);
      if (n < 0 || n > 7 || !it) continue;
      seen.add(it.id);
      out.push({ key: `plan-${p.id}`, href: `/later/${it.id}`, category: it.category, emoji: itemEmoji(it), title: it.title, sub: `planned · ${friendlyDay(p.date)}`, sort: n });
    }
    for (const i of items) {
      if (seen.has(i.id) || i.status === "done" || i.status === "archived" || !i.release_date) continue;
      const n = daysUntil(i.release_date);
      const soon = n >= 0 && (n <= 7 || (i.category === "travel" && n <= 45));
      if (!soon) continue;
      seen.add(i.id);
      const verb = i.category === "travel" && n > 7 ? "in " + n + " days" : `${VERB[i.category]} ${friendlyDay(i.release_date)}`;
      out.push({ key: `date-${i.id}`, href: `/later/${i.id}`, category: i.category, emoji: itemEmoji(i), title: i.title, sub: verb, sort: n });
    }
    // one fresh food find so the week isn't only obligations
    const fresh = items
      .filter((i) => i.category === "eat" && i.status === "saved" && !seen.has(i.id) && daysSince(i.created_at) <= 7)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (fresh) out.push({ key: `eat-${fresh.id}`, href: `/later/${fresh.id}`, category: "eat", emoji: itemEmoji(fresh), title: fresh.title, sub: "saved recently", sort: 99 });
    return out.sort((a, b) => a.sort - b.sort).slice(0, 5);
  }, [items, plans]);

  return (
    <section aria-labelledby="week-h">
      <h2 id="week-h" className="px-1 font-display text-2xl font-bold tracking-tight">this week</h2>
      {entries.length === 0 ? (
        <p className="mt-3 rounded-[28px] bg-card px-5 py-5 text-mute shadow-soft">quiet week. that&apos;s allowed. 🍃</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[28px] bg-card shadow-soft">
          {entries.map((e) => (
            <li key={e.key}>
              <Link href={e.href} className="flex items-center gap-3.5 px-4 py-3.5 active:bg-ink/[0.03]">
                <CategoryIcon category={e.category} emoji={e.emoji} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.title}</span>
                  <span className="block truncate text-sm text-mute">{e.sub}</span>
                </span>
                <span aria-hidden className="text-mute">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
