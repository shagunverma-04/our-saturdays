"use client";

import { useAppUI } from "@/components/ui/AppUI";
import { removeItem, setStatus, toggleInteraction } from "@/lib/store";
import type { SavedItem, Status } from "@/lib/types";

/** The few things that aren't a one-tap reaction: finishing, passing, editing, removing. */
export function useItemActions() {
  const { toast, openAdd } = useAppUI();

  return {
    changeStatus(item: SavedItem, status: Status) {
      setStatus(item.id, status);
      const msg: Partial<Record<Status, [string, string]>> = {
        done: ["we did it!", "🎉"],
        saved: ["back on the list", "📌"],
        archived: ["tucked away", "📦"],
      };
      const m = msg[status];
      if (m) toast(m[0], m[1]);
    },
    /** "not for us": quietly drops it from our list and the picker. Tap again to bring it back. */
    togglePass(item: SavedItem) {
      toggleInteraction(item.id, "dismissed");
    },
    edit(item: SavedItem) {
      openAdd({ edit: item, category: item.category });
    },
    remove(item: SavedItem) {
      removeItem(item.id);
      toast("removed", "🗑️");
    },
  };
}
