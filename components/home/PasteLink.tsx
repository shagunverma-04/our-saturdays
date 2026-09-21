"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppUI } from "@/components/ui/AppUI";
import { captureLink, extractUrl } from "@/lib/capture";
import { sourceWord } from "@/lib/utils";

/**
 * The iPhone-friendly fallback for capture: Share → Copy link → open the app → tap this.
 * One tap saves the link on your clipboard; no form.
 */
export function PasteLink() {
  const { toast, openAdd } = useAppUI();
  const router = useRouter();

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const url = extractUrl(text);
      if (!url) {
        toast("no link on your clipboard yet", "📋");
        return;
      }
      const { item, duplicate } = captureLink(url);
      toast(duplicate ? "already saved that one" : `saved from ${sourceWord(url)}`, duplicate ? "👀" : "✨");
      router.push(`/later/${item.id}`);
    } catch {
      // clipboard blocked (permissions / not a secure context): fall back to the sheet, where paste works normally
      openAdd();
    }
  };

  return (
    <motion.button type="button" onClick={paste} whileTap={{ scale: 0.96 }} className="glass flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold shadow-soft">
      <span aria-hidden>🔗</span> paste a link
    </motion.button>
  );
}
