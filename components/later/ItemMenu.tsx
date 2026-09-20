"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { PillButton } from "@/components/ui/bits";
import type { SavedItem } from "@/lib/types";
import { useItemActions } from "./useItemActions";

interface Props {
  item: SavedItem | null;
  onClose: () => void;
  /** called after the item is deleted (e.g. to leave its detail page) */
  onRemoved?: () => void;
}

/** The ••• sheet: quick status changes, edit, delete (with a confirm step). */
export function ItemMenu({ item, onClose, onRemoved }: Props) {
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="options">
      {item && <MenuBody item={item} onClose={onClose} onRemoved={onRemoved} />}
    </Sheet>
  );
}

function MenuBody({ item, onClose, onRemoved }: { item: SavedItem; onClose: () => void; onRemoved?: () => void }) {
  const a = useItemActions();
  const [confirm, setConfirm] = useState(false);

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
        <p className="mt-1 text-mute">this can&apos;t be undone.</p>
        <div className="mt-6 flex gap-3">
          <PillButton tone="ghost" size="lg" className="flex-1" onClick={() => setConfirm(false)}>keep it</PillButton>
          <PillButton size="lg" className="flex-1 !bg-[#c4432b]" onClick={go(() => { a.remove(item); onRemoved?.(); })}>remove</PillButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pb-2">
      <h2 className="mb-3 truncate font-display text-2xl font-bold tracking-tight">{item.title}</h2>
      {item.status !== "done" && <button className={row} onClick={go(() => a.changeStatus(item, "done"))}><span aria-hidden>🎉</span> we did it</button>}
      {item.status !== "planned" && <button className={row} onClick={go(() => a.changeStatus(item, "planned"))}><span aria-hidden>🗓️</span> plan for saturday</button>}
      {item.status !== "maybe" && <button className={row} onClick={go(() => a.changeStatus(item, "maybe"))}><span aria-hidden>🤔</span> maybe someday</button>}
      {item.status !== "saved" && <button className={row} onClick={go(() => a.changeStatus(item, "saved"))}><span aria-hidden>📌</span> back to saved</button>}
      <button className={row} onClick={go(() => a.edit(item))}><span aria-hidden>✏️</span> edit</button>
      {item.status !== "archived" && <button className={row} onClick={go(() => a.changeStatus(item, "archived"))}><span aria-hidden>📦</span> archive</button>}
      <button className={`${row} text-[#c4432b]`} onClick={() => setConfirm(true)}><span aria-hidden>🗑️</span> remove</button>
    </div>
  );
}
