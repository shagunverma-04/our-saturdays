"use client";

import { useRef, useState } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { uploadPhoto } from "@/lib/media";
import { useSession } from "@/lib/session";
import { updateItem } from "@/lib/store";

/** One tap to give a find a photo (camera or library). Nothing else to fill in. */
export function AddPhotoButton({ itemId }: { itemId: string }) {
  const { toast } = useAppUI();
  const { couple } = useSession();
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      updateItem(itemId, { image_url: await uploadPhoto(f, couple?.id ?? null) });
      toast("photo added", "📷");
    } catch {
      toast("couldn't add that photo", "🫠");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <>
      <button type="button" onClick={() => file.current?.click()} disabled={busy} className="flex h-11 items-center gap-2 rounded-full border-2 border-dashed border-ink/15 px-4 text-[14px] font-medium text-mute disabled:opacity-50">
        <span aria-hidden>📷</span> {busy ? "adding…" : "add a photo"}
      </button>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
    </>
  );
}
