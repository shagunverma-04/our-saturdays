"use client";

import { useState, type FormEvent } from "react";
import { PillButton } from "@/components/ui/bits";
import { createSpace, joinSpace, refreshSession, signOut } from "@/lib/session";
import { AuthShell } from "./AuthShell";
import { ShareCode } from "./ShareCode";

const inputCls = "h-14 w-full rounded-[20px] bg-card px-4 shadow-soft outline-none placeholder:text-mute/80 focus:ring-2 focus:ring-ink/20";

/** Signed in but not in a space yet: start ours, or join with the code your person sent. */
export function Onboarding() {
  const [path, setPath] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState("our saturdays");
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await createSpace(name);
    setBusy(false);
    if (r.error) setErr(r.error);
    else setCreated(r.code);
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await joinSpace(code);
    setBusy(false);
    if (r) setErr(r); // on success the gate swaps to the app
  };

  if (created) {
    return (
      <AuthShell pin="💌">
        <div className="space-y-4 rounded-[28px] bg-card p-5 shadow-soft">
          <h2 className="font-display text-2xl font-bold tracking-tight">our space is ready</h2>
          <p className="text-[15px] text-mute">send this code to your person. they sign up, choose &ldquo;I have a code&rdquo;, and they&apos;re in. it only works for one more person.</p>
          <ShareCode code={created} />
          <PillButton size="lg" className="w-full" onClick={() => void refreshSession()}>
            take me in
          </PillButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell pin="🏡">
      {path === "choose" && (
        <div className="space-y-3">
          <PillButton size="lg" className="w-full" onClick={() => setPath("create")}>start our space</PillButton>
          <PillButton size="lg" tone="glass" className="w-full" onClick={() => setPath("join")}>I have a code</PillButton>
        </div>
      )}
      {path === "create" && (
        <form onSubmit={create} className="space-y-3">
          <input className={inputCls} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="name of our space" placeholder="name of our space" />
          {err && <p role="status" className="px-2 text-sm text-[#c4432b]">{err}</p>}
          <PillButton type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "…" : "create it"}</PillButton>
        </form>
      )}
      {path === "join" && (
        <form onSubmit={join} className="space-y-3">
          <input className={`${inputCls} text-center font-mono tracking-[0.2em]`} value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" aria-label="invite code" placeholder="invite code" />
          {err && <p role="status" className="px-2 text-sm text-[#c4432b]">{err}</p>}
          <PillButton type="submit" size="lg" className="w-full" disabled={busy || !code.trim()}>{busy ? "…" : "join"}</PillButton>
        </form>
      )}
      <div className="flex items-center justify-between px-1">
        {path !== "choose" ? (
          <button type="button" className="h-11 text-sm font-medium text-mute" onClick={() => { setPath("choose"); setErr(null); }}>← back</button>
        ) : <span />}
        <button type="button" className="h-11 text-sm font-medium text-mute" onClick={() => void signOut()}>sign out</button>
      </div>
    </AuthShell>
  );
}
