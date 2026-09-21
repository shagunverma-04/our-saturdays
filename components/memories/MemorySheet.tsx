"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { PillButton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { earliest, readPhotoDate } from "@/lib/exif";
import { autoTitle } from "@/lib/memories";
import { deletePhoto, isStoredRef, uploadPhoto, useMediaUrl } from "@/lib/media";
import { useSession } from "@/lib/session";
import { addMemory, updateMemory, useStore } from "@/lib/store";
import type { Memory, SavedItem } from "@/lib/types";
import { toISODate } from "@/lib/utils";

const MAX_PHOTOS = 10;
const inputCls = "h-14 w-full rounded-[20px] bg-card px-4 text-ink shadow-soft placeholder:text-mute/80 outline-none focus:ring-2 focus:ring-ink/20";

interface Props {
  open: boolean;
  onClose: () => void;
  edit?: Memory;
  /** starting from a find you did: prefills the title/place and links the two */
  fromItem?: SavedItem;
  /** photos already chosen in the picker: they upload straight away and their date is read from the photo */
  files?: File[];
  /** called with the new memory's id after saving (used to jump to it in the swipe view) */
  onSaved?: (id: string) => void;
}

export function MemorySheet(props: Props) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.edit ? "Edit memory" : "New memory"}>
      {/* mounted only while open, so each open starts clean */}
      <MemoryForm {...props} />
    </Sheet>
  );
}

function Thumb({ photoRef, onRemove }: { photoRef: string; onRemove: () => void }) {
  const src = useMediaUrl(photoRef);
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-ink/[0.06]">
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      <button type="button" onClick={onRemove} aria-label="remove this photo" className="glass absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-xs">✕</button>
    </div>
  );
}

function MemoryForm({ onClose, edit, fromItem, files, onSaved }: Omit<Props, "open">) {
  const { toast } = useAppUI();
  const { couple } = useSession();
  const { memories, items } = useStore();
  const [title, setTitle] = useState(edit?.title ?? fromItem?.title ?? "");
  const [showTitle, setShowTitle] = useState(Boolean(edit || fromItem));
  const [description, setDescription] = useState(edit?.description ?? "");
  const [date, setDate] = useState(edit?.date ?? toISODate(new Date()));
  const [dateFrom, setDateFrom] = useState<"none" | "photo" | "missing">("none");
  const [location, setLocation] = useState(edit?.location ?? fromItem?.location_name ?? "");
  const [photos, setPhotos] = useState<string[]>(edit?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const dateTouched = useRef(Boolean(edit)); // never overwrite a date the person chose (or a memory's saved one)

  // photos uploaded during THIS form: if it's cancelled they're deleted again, so nothing is orphaned in storage
  const uploaded = useRef<string[]>([]);
  const saved = useRef(false);
  useEffect(
    () => () => {
      if (!saved.current) uploaded.current.forEach((r) => void deletePhoto(r).catch(() => {}));
    },
    [],
  );

  // places you've used before, one tap away
  const recentPlaces = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const l of [...memories.map((m) => m.location), ...items.map((i) => i.location_name)]) {
      const t = l.trim();
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        out.push(t);
      }
      if (out.length >= 5) break;
    }
    return out;
  }, [memories, items]);

  const addFiles = async (picked: File[]) => {
    const list = picked.slice(0, Math.max(0, MAX_PHOTOS - photos.length));
    if (!list.length) return;
    setUploading((n) => n + list.length);

    // 1. the date the photo was TAKEN, read from the original file (before it's shrunk and re-encoded)
    void Promise.all(list.map((f) => readPhotoDate(f).catch(() => null))).then((dates) => {
      const found = earliest(dates);
      if (dateTouched.current) return;
      if (found) {
        setDate(found);
        setDateFrom("photo");
      } else {
        setDateFrom((cur) => (cur === "photo" ? cur : "missing"));
      }
    });

    // 2. upload, two at a time: quick on a phone connection without hogging it
    const queue = [...list];
    const worker = async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        try {
          const ref = await uploadPhoto(f, couple?.id ?? null, "memories");
          if (isStoredRef(ref)) uploaded.current.push(ref);
          setPhotos((p) => [...p, ref]);
        } catch {
          toast("one photo didn't upload", "🫠");
        } finally {
          setUploading((n) => n - 1);
        }
      }
    };
    await Promise.all([worker(), worker()]);
  };

  // photos chosen in the picker before this sheet opened
  const started = useRef(false); // effects can run twice (React strict mode, fast refresh): never upload the same picks twice
  useEffect(() => {
    if (started.current || !files?.length) return;
    started.current = true;
    void Promise.resolve().then(() => addFiles(files));
    // run once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    void addFiles(picked);
  };

  const removePhoto = (index: number) => {
    const ref = photos[index];
    setPhotos((p) => p.filter((_, i) => i !== index)); // by position, so a repeated picture removes only the one you tapped
    if (ref && !photos.some((x, i) => i !== index && x === ref) && uploaded.current.includes(ref)) {
      uploaded.current = uploaded.current.filter((x) => x !== ref);
      void deletePhoto(ref).catch(() => {}); // it was only ever in this form
    }
  };

  const canSave = (photos.length > 0 || title.trim().length > 0 || description.trim().length > 0) && uploading === 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    saved.current = true;
    const fields = { title: title.trim() || autoTitle(date), description: description.trim(), date, location: location.trim(), photos };
    if (edit) {
      updateMemory(edit.id, fields);
      toast("updated", "✏️");
      onSaved?.(edit.id);
    } else {
      const m = addMemory({ ...fields, saved_item_id: fromItem?.id ?? null });
      toast("memory kept", "📸");
      onSaved?.(m.id);
    }
    onClose();
  };

  return (
    <form onSubmit={submit} className="pb-2">
      <h2 className="font-display text-[28px] font-bold tracking-tight">{edit ? "edit this memory" : "keep this moment"}</h2>

      <div className="no-scrollbar -mx-5 mt-4 flex gap-2.5 overflow-x-auto px-5">
        {photos.map((p, i) => (
          <Thumb key={i} photoRef={p} onRemove={() => removePhoto(i)} />
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`u${i}`} className="skeleton h-24 w-24 shrink-0 !rounded-[18px]" aria-label="uploading" />
        ))}
        {photos.length + uploading < MAX_PHOTOS && (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-ink/15 text-mute">
            <span aria-hidden className="text-2xl">📷</span>
            <span className="text-xs font-medium">{photos.length ? "add more" : "add photos"}</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 ml-2 flex items-center gap-2 text-xs text-mute">
            when
            {dateFrom === "photo" && <span className="font-semibold text-ink/70">📷 from your photo</span>}
            {dateFrom === "missing" && <span className="font-semibold text-[#b26a00]">no date in that photo, pick one</span>}
          </span>
          <input
            type="date"
            className={inputCls}
            value={date}
            max={toISODate(new Date())}
            onChange={(e) => {
              dateTouched.current = true;
              setDateFrom("none");
              setDate(e.target.value);
            }}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 ml-2 block text-xs text-mute">where</span>
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lalbagh, Bengaluru" autoComplete="off" autoFocus={Boolean(files?.length)} />
        </label>
        {recentPlaces.length > 0 && !location && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" aria-label="places you've used before">
            {recentPlaces.map((p) => (
              <button key={p} type="button" onClick={() => setLocation(p)} className="h-9 shrink-0 rounded-full bg-ink/[0.07] px-3.5 text-[13px] font-medium">📍 {p.split(",")[0]}</button>
            ))}
          </div>
        )}

        <textarea
          className="w-full resize-none rounded-[20px] bg-card p-4 shadow-soft outline-none placeholder:text-mute/80 focus:ring-2 focus:ring-ink/20"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="a few words to remember it by (optional)"
          aria-label="caption"
        />

        {showTitle ? (
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={autoTitle(date)} aria-label="title" autoComplete="off" />
        ) : (
          <button type="button" onClick={() => setShowTitle(true)} className="ml-1 h-10 text-sm font-medium text-mute">+ give it a name</button>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-5 bg-gradient-to-t from-paper via-paper to-transparent px-5 pb-1 pt-4">
        <PillButton type="submit" size="lg" disabled={!canSave} className="w-full">
          {uploading ? "uploading…" : edit ? "save changes" : "keep it"}
        </PillButton>
      </div>
    </form>
  );
}
