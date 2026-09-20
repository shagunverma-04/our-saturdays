"use client";

import { useState, type FormEvent } from "react";
import { PillButton } from "@/components/ui/bits";
import { signIn, signUp } from "@/lib/session";
import { AuthShell } from "./AuthShell";

const inputCls = "h-14 w-full rounded-[20px] bg-card px-4 shadow-soft outline-none placeholder:text-mute/80 focus:ring-2 focus:ring-ink/20";

export function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const err = await signIn(email, password);
      if (err) setMsg({ ok: false, text: err });
    } else {
      const r = await signUp(name, email, password);
      if (r.error) setMsg({ ok: false, text: r.error });
      else if (r.needsConfirm) setMsg({ ok: true, text: "check your email to confirm, then come back and sign in." });
    }
    setBusy(false); // on success the session listener swaps this screen out by itself
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && (
          <input className={inputCls} required maxLength={24} autoComplete="given-name" placeholder="what should we call you?" value={name} onChange={(e) => setName(e.target.value)} aria-label="your name" />
        )}
        <input className={inputCls} type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="email" />
        <input
          className={inputCls}
          type="password"
          required
          minLength={8}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="password"
        />
        {msg && (
          <p role="status" className={`px-2 text-sm ${msg.ok ? "text-ink" : "text-[#c4432b]"}`}>
            {msg.text}
          </p>
        )}
        <PillButton type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "…" : mode === "in" ? "come in" : "create my account"}
        </PillButton>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setMsg(null);
        }}
        className="h-11 text-sm font-medium text-mute"
      >
        {mode === "in" ? "first time? make an account" : "already have one? sign in"}
      </button>
      <p className="px-1 text-center text-xs text-mute">just for the two of us. nothing here is public.</p>
    </AuthShell>
  );
}
