"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryTile } from "@/components/ui/CategoryIcon";
import { PillButton, SourceChip } from "@/components/ui/bits";
import { CATEGORIES, CATEGORY_BY_ID } from "@/lib/categories";
import { addItem, updateItem } from "@/lib/store";
import type { CategoryId, SavedItem } from "@/lib/types";
import { looksLikeUrl, normalizeUrl, parseTags } from "@/lib/utils";
import { useAppUI } from "@/components/ui/AppUI";
import { deletePhoto, isStoredRef, uploadPhoto, useMediaUrl } from "@/lib/media";
import { fetchPreview } from "@/lib/capture";
import { useSession } from "@/lib/session";

interface Props {
  open: boolean;
  onClose: () => void;
  category?: CategoryId;
  edit?: SavedItem;
}

export function AddSheet({ open, onClose, category, edit }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={edit ? "Edit" : "What are we saving?"}>
      {/* mounted only while open, so every open starts from a clean form */}
      <AddForm onClose={onClose} category={category} edit={edit} />
    </Sheet>
  );
}

const inputCls = "h-14 w-full rounded-[20px] bg-card px-4 text-ink shadow-soft placeholder:text-mute/80 outline-none focus:ring-2 focus:ring-ink/20";

function AddForm({ onClose, category, edit }: Omit<Props, "open">) {
  const { toast } = useAppUI();
  // an unsent draft survives a dropped connection, an accidental swipe-down, or a tab reload (this session only)
  const [draft] = useState(() => (edit ? {} : readDraft()));
  const [cat, setCat] = useState<CategoryId>(edit?.category ?? category ?? "places");
  const [title, setTitle] = useState(edit?.title ?? draft.title ?? "");
  const [url, setUrl] = useState(edit?.source_url ?? draft.url ?? "");
  const [note, setNote] = useState(edit?.description ?? draft.note ?? "");
  const [location, setLocation] = useState(edit?.location_name ?? "");
  const [date, setDate] = useState(edit?.release_date ?? "");
  const [tags, setTags] = useState(edit?.tags.join(", ") ?? "");
  const [image, setImage] = useState(edit?.image_url ?? "");
  const [more, setMore] = useState(Boolean(edit && (edit.location_name || edit.release_date || edit.tags.length || edit.image_url)));
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { couple } = useSession();
  const preview = useMediaUrl(image);
  // photos uploaded during THIS session of the form: removed again if it's cancelled or the photo is swapped
  const uploaded = useRef<string[]>([]);
  const saved = useRef(false);
  useEffect(
    () => () => {
      if (!saved.current) uploaded.current.forEach((r) => void deletePhoto(r).catch(() => {}));
    },
    [],
  );

  const onTitle = (v: string) => {
    // pasted a link into the title? move it where it belongs
    if (looksLikeUrl(v) && !url) {
      setUrl(normalizeUrl(v));
      setTitle("");
      return;
    }
    setTitle(v);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    try {
      const ref = await uploadPhoto(file, couple?.id ?? null);
      // a photo we uploaded a moment ago and are now replacing is just clutter
      const prev = uploaded.current.pop();
      if (prev && prev !== ref) void deletePhoto(prev).catch(() => {});
      if (isStoredRef(ref)) uploaded.current.push(ref);
      setImage(ref);
    } catch {
      toast("couldn't add that photo", "🫠");
    } finally {
      setImgBusy(false);
      e.target.value = ""; // let the same file be picked again
    }
  };

  useEffect(() => {
    if (edit || saved.current) return;
    try {
      if (title || url || note) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, url, note }));
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* private mode: no drafts, no problem */
    }
  }, [title, url, note, edit]);

  // pasted a link and left the title empty? peek at the link (safe server-side preview) and offer its title
  const [peeking, setPeeking] = useState(false);
  useEffect(() => {
    if (edit || title || !looksLikeUrl(url)) return;
    let live = true;
    const t = setTimeout(async () => {
      setPeeking(true);
      const p = await fetchPreview(url);
      if (!live) return;
      setPeeking(false);
      if (p?.title) setTitle((cur) => cur || p.title!);
      if (p?.location) setLocation((cur) => cur || p.location!);
      if (p?.image) setImage((cur) => cur || p.image!);
    }, 700);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // only re-run when the link changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const canSave = title.trim().length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const fields = {
      title: title.trim(),
      category: cat,
      description: note.trim(),
      source_url: url.trim() ? normalizeUrl(url) : "",
      location_name: location.trim(),
      release_date: date,
      tags: parseTags(tags),
      image_url: image.trim(),
    };
    saved.current = true;
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    // if they swapped photos in this form, only the final one is kept
    uploaded.current.filter((r) => r !== image).forEach((r) => void deletePhoto(r).catch(() => {}));
    if (edit) {
      updateItem(edit.id, fields);
      toast("updated", "✏️");
    } else {
      addItem(fields);
      toast("saved for later", CATEGORY_BY_ID[cat].emoji);
    }
    onClose();
  };

  return (
    <form onSubmit={submit} className="pb-2">
      <h2 className="font-display text-[28px] font-bold tracking-tight">{edit ? "edit this" : "what are we saving?"}</h2>

      <div className="no-scrollbar -mx-5 mt-4 flex gap-1 overflow-x-auto px-4 pb-1 pt-1" role="group" aria-label="category">
        {CATEGORIES.map((c) => (
          <CategoryTile key={c.id} category={c.id} label={c.addLabel} selected={cat === c.id} onSelect={() => setCat(c.id)} />
        ))}
        <CategoryTile category="ideas" emoji="📸" label="Memory" hint="soon" selected={false} disabled onSelect={() => {}} />
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="sr-only">title</span>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder={titlePlaceholder(cat)}
            autoFocus
            enterKeyHint="done"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className="sr-only">link</span>
          <input
            className={inputCls}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="paste a link (instagram, maps, youtube…)"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
          />
        </label>
        {url && (
          <div className="ml-2 flex items-center gap-2">
            <SourceChip url={url} saved />
            {peeking && <span className="text-xs text-mute">checking the link…</span>}
          </div>
        )}

        <label className="block">
          <span className="sr-only">note</span>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="a little note (optional)" autoComplete="off" />
        </label>

        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="ml-1 h-10 text-sm font-medium text-mute">
          {more ? "− fewer details" : "+ location, date, photo, tags"}
        </button>

        {more && (
          <div className="space-y-3">
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="where? (area, city or place)" aria-label="location" autoComplete="off" />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 ml-2 block text-xs text-mute">date (release, event…)</span>
                <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 ml-2 block text-xs text-mute">tags</span>
                <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ramen, date" autoCapitalize="none" />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-card text-2xl shadow-soft"
                aria-label="add a photo"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : imgBusy ? (
                  "…"
                ) : (
                  "🖼️"
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <input
                className={inputCls}
                value={image.startsWith("data:") || isStoredRef(image) ? "" : image}
                onChange={(e) => setImage(e.target.value)}
                placeholder={image.startsWith("data:") || isStoredRef(image) ? "photo added ✓" : "or paste an image link"}
                inputMode="url"
                autoCapitalize="none"
                aria-label="image link"
              />
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-5 bg-gradient-to-t from-paper via-paper to-transparent px-5 pb-1 pt-4">
        <PillButton type="submit" size="lg" disabled={!canSave} className="w-full">
          {edit ? "save changes" : "save it"}
        </PillButton>
      </div>
    </form>
  );
}

const DRAFT_KEY = "our-saturdays:draft";
function readDraft(): Partial<Record<"title" | "url" | "note", string>> {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function titlePlaceholder(c: CategoryId): string {
  switch (c) {
    case "eat": return "what are we eating?";
    case "watch": return "what are we watching?";
    case "do": return "what are we trying?";
    case "shop": return "what do we want?";
    case "travel": return "where are we going?";
    case "ideas": return "what's the idea?";
    default: return "where are we going?";
  }
}
