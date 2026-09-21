"use client";

import { useCallback, useMemo } from "react";
import { conversation, signalsFor, type Names, type Signals } from "./shared";
import { useStore } from "./store";
import type { Interaction, Profile, SavedItem } from "./types";

/** The store plus everything derived from reactions, computed once per change (all callbacks are stable). */
export function useShared() {
  const s = useStore();
  const partner: Profile | undefined = s.profiles.find((p) => p.id !== s.meId);
  const me: Profile | undefined = s.profiles.find((p) => p.id === s.meId);
  const partnerName = partner?.name ?? "";
  const names: Names = useMemo(() => ({ meId: s.meId, partner: partnerName }), [s.meId, partnerName]);

  const sigs = useMemo(() => {
    const byItem = new Map<string, Interaction[]>();
    for (const i of s.interactions) {
      const list = byItem.get(i.saved_item_id);
      if (list) list.push(i);
      else byItem.set(i.saved_item_id, [i]);
    }
    return new Map(s.items.map((it) => [it.id, signalsFor(it, byItem.get(it.id) ?? [], s.meId)]));
  }, [s.items, s.interactions, s.meId]);

  const plannedIds = useMemo(() => new Set(s.plans.map((p) => p.saved_item_id).filter((x): x is string => Boolean(x))), [s.plans]);

  const sig = useCallback((item: SavedItem): Signals => sigs.get(item.id) ?? signalsFor(item, [], s.meId), [sigs, s.meId]);
  const line = useCallback((item: SavedItem): string => conversation(item, sig(item), names), [sig, names]);
  /** "found by you" / "found by Aarav" */
  const foundBy = useCallback(
    (item: SavedItem): string => (item.created_by === s.meId ? "found by you" : `found by ${s.profiles.find((p) => p.id === item.created_by)?.name ?? "your person"}`),
    [s.meId, s.profiles],
  );

  return { ...s, me, partner, names, plannedIds, sig, line, foundBy };
}
