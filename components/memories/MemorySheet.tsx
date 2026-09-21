"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { PillButton } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { deletePhoto, isStoredRef, uploadPhoto, useMediaUrl } from "@/lib/media";
import { useSession } from "@/lib/session";
import { addMemory, updateMemory } from "@/lib/store";
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
}

export function MemorySheet({ open, onClose, edit, fromItem }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={edit ? "Edit memory" : "New memory"}>
      {/* mounted only while open, so each open starts clean */}
      <MemoryForm onClose={onClose} edit={edit} fromItem={fromItem} />
    </Sheet>
  );
}

function Thumb({ photoRef, onRemove }: { photoRef: string; onRemove: () => void }) {
  const src = useMediaUrl(photoRef);
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] bg-ink/[0.06]">
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      <button type="button" onClick={onRemove} aria-label="remove this photo" className="glass absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-sm">✕</button>
    </div>
  );
}

function MemoryForm({ onClose, edit, fromItem }: Omit<Props, "open">) {
  const { toast } = useAppUI();
  const { couple } = useSession();
  const [title, setTitle] = useState(edit?.title ?? fromItem?.title ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [date, setDate] = useState(edit?.date ?? toISODate(new Date()));
  const [location, setLocation] = useState(edit?.location ?? fromItem?.location_name ?? "");
  const [photos, setPhotos] = useState<string[]>(edit?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // photos uploaded during THIS form: if it's cancelled they're deleted again, so nothing is orphaned in storage
  const uploaded = useRef<string[]>([]);
  const saved = useRef(false);
  useEffect(
    () => () => {
      if (!saved.current) uploaded.current.forEach((r) => void deletePhoto(r).catch(() => {}));
    },
    [],
  );

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, MAX_PHOTOS - photos.length));
    e.target.value = "";
    if (!files.length) return;
    setUploading((n) => n + files.length);
    // two at a time: quick on a phone connection without hogging it
    const queue = [...files];
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

  const removePhoto = (ref: string) => {
    setPhotos((p) => p.filter((x) => x !== ref));
    if (uploaded.current.includes(ref)) {
      uploaded.current = uploaded.current.filter((x) => x !== ref);
      void deletePhoto(ref).catch(() => {}); // it was only ever in this form
    }
  };

  const canSave = (title.trim().length > 0 || photos.length > 0) && uploading === 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    saved.current = true;
    const fields = { title: title.trim() || "a moment", description: description.trim(), date, location: location.trim(), photos };
    if (edit) {
      updateMemory(edit.id, fields);
      toast("updated", "✏️");
    } else {
      addMemory({ ...fields, saved_item_id: fromItem?.id ?? null });
      toast("memory kept", "📸");
    }
    onClose();
  };

  return (
    <form onSubmit={submit} className="pb-2">
      <h2 className="font-display text-[28px] font-bold tracking-tight">{edit ? "edit this memory" : "keep this moment"}</h2>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {photos.map((p) => (
          <Thumb key={p} photoRef={p} onRemove={() => removePhoto(p)} />
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`u${i}`} className="skeleton aspect-square !rounded-[18px]" aria-label="uploading" />
        ))}
        {photos.length + uploading < MAX_PHOTOS && (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-ink/15 text-mute">
            <span aria-hidden className="text-2xl">📷</span>
            <span className="text-xs font-medium">{photos.length ? "add more" : "add photos"}</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />

      <div className="mt-4 space-y-3">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="what do we call it? (that random tuesday…)" aria-label="title" autoComplete="off" />
        <textarea
          className="w-full resize-none rounded-[20px] bg-card p-4 shadow-soft outline-none placeholder:text-mute/80 focus:ring-2 focus:ring-ink/20"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="a few words to remember it by"
          aria-label="caption"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 ml-2 block text-xs text-mute">when</span>
            <input type="date" className={inputCls} value={date} max={toISODate(new Date())} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 ml-2 block text-xs text-mute">where</span>
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="optional" autoComplete="off" />
          </label>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-5 bg-gradient-to-t from-paper via-paper to-transparent px-5 pb-1 pt-4">
        <PillButton type="submit" size="lg" disabled={!canSave} className="w-full">
          {uploading ? "uploading…" : edit ? "save changes" : "keep it"}
        </PillButton>
      </div>
    </form>
  );
}
