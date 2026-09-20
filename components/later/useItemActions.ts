"use client";

import { useAppUI } from "@/components/ui/AppUI";
import { removeItem, setStatus } from "@/lib/store";
import type { SavedItem, Status } from "@/lib/types";
import { nextSaturday, toISODate } from "@/lib/utils";

/** Shared actions for cards, menus and the detail page. Each one gives a little feedback. */
export function useItemActions() {
  const { toast, openAdd } = useAppUI();

  return {
    letsGo(item: SavedItem) {
      setStatus(item.id, "planned", toISODate(nextSaturday()));
      toast("it's a date — saturday", "🗓️");
    },
    changeStatus(item: SavedItem, status: Status) {
      setStatus(item.id, status);
      const msg: Record<Status, [string, string]> = {
        saved: ["back on the list", "📌"],
        planned: ["it's a date — saturday", "🗓️"],
        done: ["we did it!", "🎉"],
        maybe: ["maybe someday", "🤔"],
        archived: ["tucked away", "📦"],
      };
      toast(msg[status][0], msg[status][1]);
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
