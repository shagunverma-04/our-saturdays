"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { PillButton } from "@/components/ui/bits";
import type { SavedItem } from "@/lib/types";
import { useShared } from "@/lib/useShared";
import { useItemActions } from "./useItemActions";

interface Props {
  item: SavedItem | null;
  onClose: () => void;
  /** called after the item is deleted (e.g. to leave its detail page) */
  onRemoved?: () => void;
}

/** The ••• sheet. Deliberately short: no statuses to manage, just a few real actions. */
export function ItemMenu({ item, onClose, onRemoved }: Props) {
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="options">
      {item && <MenuBody item={item} onClose={onClose} onRemoved={onRemoved} />}
    </Sheet>
  );
}

function MenuBody({ item, onClose, onRemoved }: { item: SavedItem; onClose: () => void; onRemoved?: () => void }) {
  const a = useItemActions();
  const { sig } = useShared();
  const [confirm, setConfirm] = useState(false);
  const passed = sig(item).mine.has("dismissed");

  const row = "flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left text-[16px] font-medium shadow-soft active:scale-[0.98]";
  const go = (fn: () => void) => () => {
    fn();
    onClose();
  };

  if (confirm) {
    return (
      <div className="pb-2 text-center">
        <p className="text-5xl" aria-hidden>🥺</p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">remove {item.title}?</h2>
        <p className="mt-1 text-mute">this can&apos;t be undone, and it goes for both of you.</p>
        <div className="mt-6 flex gap-3">
          <PillButton tone="ghost" size="lg" className="flex-1" onClick={() => setConfirm(false)}>keep it</PillButton>
          <PillButton size="lg" className="flex-1 !bg-[#c4432b] !text-white" onClick={go(() => { a.remove(item); onRemoved?.(); })}>remove</PillButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pb-2">
      <h2 className="mb-3 truncate font-display text-2xl font-bold tracking-tight">{item.title}</h2>
      {item.status === "done" ? (
        <button className={row} onClick={go(() => a.changeStatus(item, "saved"))}><span aria-hidden>↩️</span> we haven&apos;t actually done this</button>
      ) : (
        <button className={row} onClick={go(() => a.changeStatus(item, "done"))}><span aria-hidden>🎉</span> we did it</button>
      )}
      <button className={row} onClick={go(() => a.edit(item))}><span aria-hidden>✏️</span> edit</button>
      <button className={row} onClick={go(() => a.togglePass(item))}>
        <span aria-hidden>{passed ? "🔁" : "🙅"}</span> {passed ? "actually, bring it back" : "not for us"}
      </button>
      {item.status !== "archived" && <button className={row} onClick={go(() => a.changeStatus(item, "archived"))}><span aria-hidden>📦</span> archive</button>}
      <button className={`${row} text-[#c4432b]`} onClick={() => setConfirm(true)}><span aria-hidden>🗑️</span> remove</button>
    </div>
  );
}
