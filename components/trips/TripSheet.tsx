"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { PillButton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { addTrip, updateTrip } from "@/lib/store";
import type { Trip } from "@/lib/types";

const inputCls = "h-14 w-full rounded-[20px] bg-card px-4 text-ink shadow-soft placeholder:text-mute/80 outline-none focus:ring-2 focus:ring-ink/20";

export function TripSheet({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Trip }) {
  return (
    <Sheet open={open} onClose={onClose} title={edit ? "Edit trip" : "New trip"}>
      <TripForm onClose={onClose} edit={edit} />
    </Sheet>
  );
}

function TripForm({ onClose, edit }: { onClose: () => void; edit?: Trip }) {
  const router = useRouter();
  const { toast } = useAppUI();
  const [title, setTitle] = useState(edit?.title ?? "");
  const [destination, setDestination] = useState(edit?.destination ?? "");
  const [start, setStart] = useState(edit?.start_date ?? "");
  const [end, setEnd] = useState(edit?.end_date ?? "");
  const [budget, setBudget] = useState(edit?.budget_estimate != null ? String(edit.budget_estimate) : "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = title.trim() || destination.trim();
    if (!name) return;
    const budget_estimate = budget.trim() === "" || !Number.isFinite(Number(budget)) || Number(budget) < 0 ? null : Number(budget);
    const fields = { title: name, destination: destination.trim() || name, start_date: start, end_date: end && end >= start ? end : "", budget_estimate };
    if (edit) {
      updateTrip(edit.id, fields);
      toast("trip updated", "✈️");
    } else {
      const t = addTrip(fields);
      toast("new trip!", "✈️");
      router.push(`/trips/${t.id}`);
    }
    onClose();
  };

  return (
    <form onSubmit={submit} className="pb-2">
      <h2 className="font-display text-[28px] font-bold tracking-tight">{edit ? "edit this trip" : "where are we going?"}</h2>
      <div className="mt-4 space-y-3">
        <input className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="destination (Goa, Coorg, Kyoto…)" aria-label="destination" autoFocus={!edit} autoComplete="off" />
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="a name for it (optional)" aria-label="trip name" autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 ml-2 block text-xs text-mute">from</span><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="block"><span className="mb-1 ml-2 block text-xs text-mute">to</span><input type="date" className={inputCls} value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        <label className="block">
          <span className="mb-1 ml-2 block text-xs text-mute">rough budget, optional (₹)</span>
          <input className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="25000" aria-label="budget" />
        </label>
      </div>
      <div className="sticky bottom-0 -mx-5 mt-5 bg-gradient-to-t from-paper via-paper to-transparent px-5 pb-1 pt-4">
        <PillButton type="submit" size="lg" className="w-full" disabled={!(title.trim() || destination.trim())}>{edit ? "save changes" : "start planning"}</PillButton>
      </div>
    </form>
  );
}
