"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { useAppUI } from "@/components/ui/AppUI";
import { Chip, PillButton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { whenLabel, formatTime12 } from "@/lib/calendar";
import { addExpense, addTripItem, removeExpense, removeTripItem, updateMemory, updateTrip, updateTripItem } from "@/lib/store";
import { budgetSummary, dayLabel, EXPENSE_CATEGORIES, formatINR, itemTypeForCategory, itinerary, suggestedFinds, tripDates, TYPE_EMOJI } from "@/lib/trips";
import type { ExpenseCategory, SavedItem, Trip, TripItem, TripItemType } from "@/lib/types";
import { useShared } from "@/lib/useShared";
import { cn } from "@/lib/utils";

const inputCls = "h-12 w-full rounded-[18px] bg-card px-4 text-ink shadow-soft placeholder:text-mute/80 outline-none focus:ring-2 focus:ring-ink/20";
const card = "rounded-[28px] bg-card p-5 shadow-soft";

function schedLabel(i: TripItem): string {
  if (!i.scheduled_date) return "";
  return `${dayLabel(i.scheduled_date)}${i.scheduled_time ? ` · ${formatTime12(i.scheduled_time)}` : ""}`;
}

// ---- overview ---------------------------------------------------------------------------------------

export function OverviewTab({ trip, goto }: { trip: Trip; goto: (tab: string) => void }) {
  const { items } = useShared();
  const days = tripDates(trip).length;
  const count = (t: TripItemType) => trip.items.filter((i) => i.item_type === t).length;
  const scheduled = trip.items.filter((i) => i.scheduled_date).length;
  const suggested = suggestedFinds(trip, items);
  const stats: Array<[string, number, string]> = [["📍", count("place"), "place"], ["🍽️", count("food"), "food"], ["🏨", count("stay"), "stay"], ["🎯", count("activity"), "activity"]];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {stats.map(([e, n, tab]) => (
          <button key={tab} type="button" onClick={() => goto(tab)} className="rounded-[22px] bg-card py-3 text-center shadow-soft active:scale-95">
            <span aria-hidden className="text-xl">{e}</span>
            <span className="block font-display text-2xl font-bold leading-tight">{n}</span>
          </button>
        ))}
      </div>
      <p className="px-1 text-[15px] text-mute">
        {days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "no dates yet"} · {scheduled} of {trip.items.length} things on the itinerary
      </p>

      {suggested.length > 0 && (
        <div className={card}>
          <p className="font-semibold">looks like these are for {trip.destination} 👀</p>
          <div className="mt-3 space-y-2">
            {suggested.slice(0, 4).map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-ink/[0.05] p-2.5 pl-3.5">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{f.title}</span>
                <button type="button" onClick={() => addTripItem(trip.id, { saved_item_id: f.id, item_type: itemTypeForCategory(f.category), title: f.title, location: f.location_name })} className="h-9 shrink-0 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-on-ink">add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className="mb-2 ml-2 block text-sm font-semibold text-mute">notes</span>
        <NotesField key={trip.id} tripId={trip.id} saved={trip.notes} />
      </label>
    </div>
  );
}

function NotesField({ tripId, saved }: { tripId: string; saved: string }) {
  const [v, setV] = useState(saved);
  return <textarea value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== saved && updateTrip(tripId, { notes: v })} rows={4} placeholder="flights, bookings, who's driving…" className="w-full resize-none rounded-[24px] bg-card p-4 shadow-soft outline-none placeholder:text-mute/80 focus:ring-2 focus:ring-ink/20" />;
}

// ---- schedule an item (day + optional time) --------------------------------------------------------------

function ScheduleSheet({ trip, item, onClose }: { trip: Trip; item: TripItem | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="schedule">
      {item && <ScheduleForm key={item.id} trip={trip} item={item} onClose={onClose} />}
    </Sheet>
  );
}
function ScheduleForm({ trip, item, onClose }: { trip: Trip; item: TripItem; onClose: () => void }) {
  const [date, setDate] = useState(item.scheduled_date);
  const [time, setTime] = useState(item.scheduled_time);
  const dates = tripDates(trip);
  return (
    <div className="pb-2">
      <h2 className="truncate font-display text-2xl font-bold tracking-tight">{item.title}</h2>
      <p className="mt-1 text-sm text-mute">which day? (you can leave the time empty)</p>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        <Chip active={date === ""} onClick={() => setDate("")}>not yet</Chip>
        {dates.map((d) => <Chip key={d} active={date === d} onClick={() => setDate(d)}>{dayLabel(d)}</Chip>)}
      </div>
      {dates.length === 0 && <input type="date" className={`${inputCls} mt-3`} value={date} onChange={(e) => setDate(e.target.value)} aria-label="day" />}
      <label className="mt-3 block">
        <span className="mb-1 ml-2 block text-xs text-mute">time (optional)</span>
        <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
      </label>
      <PillButton size="lg" className="mt-5 w-full" onClick={() => { updateTripItem(item.id, { scheduled_date: date, scheduled_time: date ? time : "" }); onClose(); }}>save</PillButton>
    </div>
  );
}

// ---- a list of places / food / stay / things -------------------------------------------------------------

const EMPTY: Record<TripItemType, [string, string]> = {
  place: ["📍", "no places yet. add the ones you want to see."],
  food: ["🍽️", "nothing to eat yet. dangerous."],
  stay: ["🏨", "where are we sleeping?"],
  activity: ["🎯", "what should we do there?"],
  other: ["📌", "nothing here yet."],
};

function FindsPicker({ trip, type, open, onClose }: { trip: Trip; type: TripItemType; open: boolean; onClose: () => void }) {
  const { items } = useShared();
  const linked = new Set(trip.items.map((i) => i.saved_item_id));
  const sug = new Set(suggestedFinds(trip, items).map((f) => f.id));
  const pool = items.filter((i) => i.status !== "done" && i.status !== "archived").sort((a, b) => Number(sug.has(b.id)) - Number(sug.has(a.id)) || b.created_at.localeCompare(a.created_at));
  return (
    <Sheet open={open} onClose={onClose} title="add from our list">
      <h2 className="font-display text-2xl font-bold tracking-tight">from our list</h2>
      <ul className="mt-3 space-y-2 pb-2">
        {pool.length === 0 && <li className="text-mute">nothing saved yet.</li>}
        {pool.map((f: SavedItem) => {
          const added = linked.has(f.id);
          return (
            <li key={f.id} className="flex items-center gap-3 rounded-[20px] bg-card p-3 pl-4 shadow-soft">
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{f.title}</span><span className="block truncate text-sm text-mute">{sug.has(f.id) ? `for ${trip.destination} · ` : ""}{f.location_name || f.category}</span></span>
              <button type="button" disabled={added} onClick={() => addTripItem(trip.id, { saved_item_id: f.id, item_type: type, title: f.title, location: f.location_name })} className="h-9 shrink-0 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-on-ink disabled:bg-ink/10 disabled:text-mute">{added ? "added ✓" : "add"}</button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

export function ListTab({ trip, type }: { trip: Trip; type: TripItemType }) {
  const [title, setTitle] = useState("");
  const [pick, setPick] = useState(false);
  const [sched, setSched] = useState<TripItem | null>(null);
  const rows = trip.items.filter((i) => i.item_type === type);
  const [emoji, empty] = EMPTY[type];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTripItem(trip.id, { item_type: type, title: title.trim() });
    setTitle("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`add ${type === "activity" ? "a thing to do" : type === "food" ? "somewhere to eat" : `a ${type}`}…`} aria-label="add an item" autoComplete="off" />
        <PillButton type="submit" disabled={!title.trim()}>add</PillButton>
      </form>
      <button type="button" onClick={() => setPick(true)} className="ml-1 h-10 text-sm font-semibold text-mute">＋ from our saved list</button>

      {rows.length === 0 ? (
        <p className="rounded-[28px] bg-card px-5 py-8 text-center text-mute shadow-soft"><span aria-hidden className="mb-2 block text-4xl">{emoji}</span>{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-[22px] bg-card p-3.5 pl-4 shadow-soft">
              <span aria-hidden className="text-xl">{TYPE_EMOJI[i.item_type]}</span>
              <span className="min-w-0 flex-1">
                {i.saved_item_id ? <Link href={`/later/${i.saved_item_id}`} className="block truncate font-semibold underline decoration-ink/20 underline-offset-4">{i.title}</Link> : <span className="block truncate font-semibold">{i.title}</span>}
                <span className="block truncate text-sm text-mute">{[i.location, schedLabel(i)].filter(Boolean).join(" · ") || "not on the itinerary yet"}</span>
              </span>
              <button type="button" onClick={() => setSched(i)} aria-label={`schedule ${i.title}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/[0.07]">🗓️</button>
              <button type="button" onClick={() => removeTripItem(i.id)} aria-label={`remove ${i.title}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/[0.07] text-mute">✕</button>
            </li>
          ))}
        </ul>
      )}
      <FindsPicker trip={trip} type={type} open={pick} onClose={() => setPick(false)} />
      <ScheduleSheet trip={trip} item={sched} onClose={() => setSched(null)} />
    </div>
  );
}

// ---- itinerary ------------------------------------------------------------------------------------------------

function AddToDay({ trip, date, onClose }: { trip: Trip; date: string | null; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<TripItemType>("activity");
  const loose = trip.items.filter((i) => !i.scheduled_date);
  return (
    <Sheet open={Boolean(date)} onClose={onClose} title="add to this day">
      {date && (
        <div className="pb-2">
          <h2 className="font-display text-2xl font-bold tracking-tight">{dayLabel(date)}</h2>
          {loose.length > 0 && (
            <>
              <p className="mt-3 text-sm font-semibold text-mute">already on our lists</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {loose.map((i) => <Chip key={i.id} onClick={() => { updateTripItem(i.id, { scheduled_date: date }); onClose(); }}>{TYPE_EMOJI[i.item_type]} {i.title}</Chip>)}
              </div>
            </>
          )}
          <p className="mt-4 text-sm font-semibold text-mute">or something new</p>
          <form className="mt-2 space-y-2.5" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; addTripItem(trip.id, { title: title.trim(), item_type: type, scheduled_date: date, scheduled_time: time }); setTitle(""); setTime(""); onClose(); }}>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="breakfast, sunset, dinner…" aria-label="what" autoComplete="off" />
            <div className="flex gap-2.5">
              <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} aria-label="time" />
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as TripItemType)} aria-label="type">
                {(["activity", "food", "place", "stay", "other"] as TripItemType[]).map((t) => <option key={t} value={t}>{TYPE_EMOJI[t]} {t === "activity" ? "thing to do" : t}</option>)}
              </select>
            </div>
            <PillButton type="submit" size="lg" className="w-full" disabled={!title.trim()}>add to this day</PillButton>
          </form>
        </div>
      )}
    </Sheet>
  );
}

export function ItineraryTab({ trip, editTrip }: { trip: Trip; editTrip: () => void }) {
  const plan = useMemo(() => itinerary(trip), [trip]);
  const [addDay, setAddDay] = useState<string | null>(null);
  const [sched, setSched] = useState<TripItem | null>(null);

  if (plan.days.length === 0) {
    return (
      <div className={`${card} text-center`}>
        <p className="text-4xl" aria-hidden>🗓️</p>
        <p className="mt-2 font-semibold">add dates to plan day by day</p>
        <PillButton className="mt-4" onClick={editTrip}>set dates</PillButton>
        {plan.unscheduled.length > 0 && <p className="mt-3 text-sm text-mute">your {plan.unscheduled.length} things will line up here.</p>}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {plan.days.map((d) => (
        <section key={d.date} className={card} aria-label={d.label}>
          <h3 className="font-display text-lg font-bold tracking-tight">{d.label}</h3>
          <ul className="mt-2 divide-y divide-line">
            {d.items.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setSched(i)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className="w-16 shrink-0 text-[13px] font-semibold text-mute">{formatTime12(i.scheduled_time) || "anytime"}</span>
                  <span aria-hidden>{TYPE_EMOJI[i.item_type]}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{i.title}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setAddDay(d.date)} className="mt-1 h-10 text-sm font-semibold text-mute">＋ add</button>
        </section>
      ))}
      {plan.unscheduled.length > 0 && (
        <section className={card} aria-label="not scheduled yet">
          <h3 className="font-display text-lg font-bold tracking-tight">not scheduled yet</h3>
          <ul className="mt-2 divide-y divide-line">
            {plan.unscheduled.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <span aria-hidden>{TYPE_EMOJI[i.item_type]}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{i.title}</span>
                <button type="button" onClick={() => setSched(i)} className="h-9 shrink-0 rounded-full bg-ink/[0.07] px-3.5 text-[13px] font-semibold">pick a day</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <AddToDay key={addDay ?? "none"} trip={trip} date={addDay} onClose={() => setAddDay(null)} />
      <ScheduleSheet trip={trip} item={sched} onClose={() => setSched(null)} />
    </div>
  );
}

// ---- budget ----------------------------------------------------------------------------------------------------

const CAT_EMOJI: Record<ExpenseCategory, string> = { stay: "🏨", food: "🍽️", travel: "🚆", activities: "🎯", shopping: "🛍️", other: "📌" };

export function BudgetTab({ trip }: { trip: Trip }) {
  const { profiles } = useShared();
  const b = budgetSummary(trip);
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState<ExpenseCategory>("food");
  const [desc, setDesc] = useState("");
  const [est, setEst] = useState(trip.budget_estimate != null ? String(trip.budget_estimate) : "");
  const pct = b.estimate ? Math.min(100, Math.round((b.spent / b.estimate) * 100)) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    addExpense(trip.id, { category: cat, amount: n, description: desc.trim() });
    setAmount("");
    setDesc("");
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-end justify-between">
          <div><p className="text-sm text-mute">spent</p><p className="font-display text-4xl font-bold leading-none tracking-tight">{formatINR(b.spent)}</p></div>
          <div className="text-right"><p className="text-sm text-mute">estimated</p>
            <label className="flex items-center justify-end gap-1 font-display text-2xl font-bold">₹<input value={est} onChange={(e) => setEst(e.target.value)} onBlur={() => { const v = est.trim() === "" ? null : Number(est); if (v === null || (Number.isFinite(v) && v >= 0)) updateTrip(trip.id, { budget_estimate: v }); }} inputMode="decimal" placeholder="—" aria-label="estimated budget" className="w-28 bg-transparent text-right outline-none placeholder:text-mute/60" /></label>
          </div>
        </div>
        {b.estimate != null && (
          <>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink/[0.08]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="budget used">
              <div className={cn("h-full rounded-full transition-all", b.overBy > 0 ? "bg-[#c4432b]" : "bg-sun")} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm font-medium">{b.overBy > 0 ? `${formatINR(b.overBy)} over budget 😬` : `${formatINR(b.remaining ?? 0)} left`}</p>
          </>
        )}
      </div>

      {b.byCategory.length > 0 && (
        <div className={card}>
          {b.byCategory.map((c) => (
            <div key={c.category} className="py-1.5">
              <div className="flex justify-between text-[15px]"><span>{CAT_EMOJI[c.category]} {c.category}</span><span className="font-semibold">{formatINR(c.amount)}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]"><div className="h-full rounded-full bg-ink/60" style={{ width: `${c.pct}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className={`${card} space-y-3`}>
        <p className="font-semibold">add an expense</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {EXPENSE_CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{CAT_EMOJI[c]} {c}</Chip>)}
        </div>
        <div className="flex gap-2">
          <input className={`${inputCls} w-32 shrink-0`} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="₹ amount" aria-label="amount" />
          <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="what for? (optional)" aria-label="what for" autoComplete="off" />
        </div>
        <PillButton type="submit" className="w-full" disabled={!(Number(amount) > 0)}>add</PillButton>
      </form>

      {trip.expenses.length > 0 && (
        <ul className="space-y-2">
          {[...trip.expenses].sort((a, b2) => b2.created_at.localeCompare(a.created_at)).map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-[22px] bg-card p-3.5 pl-4 shadow-soft">
              <span aria-hidden className="text-xl">{CAT_EMOJI[e.category]}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{e.description || e.category}</span><span className="block text-sm text-mute">{e.paid_by ? `paid by ${profiles.find((p) => p.id === e.paid_by)?.name ?? "someone"}` : e.category}</span></span>
              <span className="font-semibold">{formatINR(e.amount)}</span>
              <button type="button" onClick={() => removeExpense(e.id)} aria-label={`remove ${e.description || e.category}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.07] text-mute">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- memories from this trip ---------------------------------------------------------------------------------

export function TripMemoriesTab({ trip }: { trip: Trip }) {
  const { memories } = useShared();
  const { pickMemoryPhotos } = useAppUI();
  const [tagging, setTagging] = useState(false);
  const mine = memories.filter((m) => m.trip_id === trip.id);
  const untagged = memories.filter((m) => !m.trip_id);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <PillButton className="flex-1" onClick={() => pickMemoryPhotos({ tripId: trip.id })}>📷 add photos</PillButton>
        {untagged.length > 0 && <PillButton tone="ghost" onClick={() => setTagging(true)}>tag one we have</PillButton>}
      </div>
      {mine.length === 0 ? (
        <p className="rounded-[28px] bg-card px-5 py-8 text-center text-mute shadow-soft"><span aria-hidden className="mb-2 block text-4xl">📸</span>no memories from this trip yet.</p>
      ) : (
        <div className="columns-2 gap-3">{mine.map((m) => <MemoryCard key={m.id} memory={m} />)}</div>
      )}
      <Sheet open={tagging} onClose={() => setTagging(false)} title="tag a memory to this trip">
        <h2 className="font-display text-2xl font-bold tracking-tight">tag to {trip.title}</h2>
        <ul className="mt-3 space-y-2 pb-2">
          {untagged.map((m) => (
            <li key={m.id}><button type="button" onClick={() => { updateMemory(m.id, { trip_id: trip.id }); setTagging(false); }} className="flex h-14 w-full items-center gap-3 rounded-[20px] bg-card px-4 text-left shadow-soft"><span aria-hidden>📸</span><span className="min-w-0 flex-1 truncate font-medium">{m.title}</span><span className="text-sm text-mute">{m.date.slice(5)}</span></button></li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) {
  return <div role="tabpanel">{children}</div>;
}
export { whenLabel };
