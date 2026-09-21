"use client";

import { useState } from "react";
import { Burst } from "@/components/ui/Burst";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Avatar, PillButton } from "@/components/ui/bits";
import { iconFor } from "@/lib/categories";
import { pickWhoSaved, scoreFor } from "@/lib/games";
import { recordPlay } from "@/lib/store";
import type { SavedItem } from "@/lib/types";
import { useShared } from "@/lib/useShared";
import { daysSince, timeAgo } from "@/lib/utils";

export function WhoTab() {
  const { items, games, profiles, meId } = useShared();
  const [item, setItem] = useState<SavedItem | null>(() => pickWhoSaved(items, games, meId));
  const [guess, setGuess] = useState<string | null>(null);
  const score = scoreFor(games, meId, "who_saved");
  const history = games.filter((g) => g.type === "who_saved" && g.attempts.some((a) => a.user_id === meId)).sort((a, b) => (b.attempts.find((x) => x.user_id === meId)!.created_at).localeCompare(a.attempts.find((x) => x.user_id === meId)!.created_at));

  if (profiles.length < 2) return <p className="rounded-[28px] bg-card p-6 text-center text-mute shadow-soft">this one needs both of you in the space.</p>;

  const answer = (id: string) => {
    if (!item || guess) return;
    setGuess(id);
    recordPlay("who_saved", item.id, item.created_by, id, id === item.created_by);
  };
  const next = () => {
    setGuess(null);
    // the one just played now counts as played, so this can't repeat it
    setItem(pickWhoSaved(items.filter((i) => i.id !== item?.id), games, meId));
  };
  const right = guess !== null && item !== null && guess === item.created_by;
  const author = item ? profiles.find((p) => p.id === item.created_by) : undefined;

  return (
    <div className="space-y-4">
      {score.played > 0 && <p className="px-1 text-[15px] text-mute">you&apos;re {score.right} for {score.played} so far</p>}
      {!item ? (
        <p className="rounded-[28px] bg-card p-6 text-center text-mute shadow-soft">nothing old enough to quiz you on yet. save a few things and check back in a few days 🌱</p>
      ) : (
        <div className="relative rounded-[32px] bg-card p-6 text-center shadow-soft">
          {right && <Burst />}
          <div className="flex justify-center"><CategoryIcon category={iconFor(item)} size="lg" className="scale-[1.6] my-3" /></div>
          <p className="mt-4 font-display text-[22px] font-semibold leading-snug tracking-tight">this has been sitting on our list for {daysSince(item.created_at)} days.</p>
          {guess === null ? (
            <>
              <p className="mt-4 text-[17px] font-semibold">who saved this?</p>
              <div className="mt-3 flex gap-2">
                {profiles.map((p) => <PillButton key={p.id} tone="ghost" size="lg" className="flex-1" onClick={() => answer(p.id)}>{p.avatar} {p.name}</PillButton>)}
              </div>
            </>
          ) : (
            <div role="status" className="mt-4">
              <p className="font-display text-2xl font-bold tracking-tight">{right ? "you got it 🫶" : `nope. ${author?.name ?? "someone"} did`}</p>
              <p className="mt-1 text-[15px] text-mute">{item.title}</p>
              <PillButton className="mt-4 w-full" onClick={next}>another one</PillButton>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <section aria-label="history" className="space-y-2">
          <h3 className="px-1 font-display text-lg font-bold tracking-tight">history</h3>
          {history.slice(0, 20).map((g) => {
            const a = g.attempts.find((x) => x.user_id === meId)!;
            const it = items.find((i) => i.id === g.prompt);
            const who = profiles.find((p) => p.id === a.guess);
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-[22px] bg-card p-3.5 pl-4 shadow-soft">
                <span aria-hidden className="text-xl">{a.correct ? "✅" : "❌"}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{it?.title ?? "a find we removed"}</span><span className="block truncate text-sm text-mute">you said {who?.name ?? "someone"} · {timeAgo(a.created_at)}</span></span>
                {who && <Avatar profile={who} size={26} />}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
