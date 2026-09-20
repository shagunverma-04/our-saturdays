"use client";

import { useState } from "react";
import { PillButton } from "@/components/ui/bits";

/** The invite code, big, with copy / share. */
export function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const message = `come join our saturdays 🫶 — sign up, choose "I have a code", and enter: ${code}`;

  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ text: message });
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-paper p-3">
      <code className="flex-1 select-all text-center font-mono text-xl font-semibold tracking-[0.18em]">{code}</code>
      <PillButton tone="ink" onClick={share}>{copied ? "copied ✓" : "share"}</PillButton>
    </div>
  );
}
