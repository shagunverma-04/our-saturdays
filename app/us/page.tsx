"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ShareCode } from "@/components/auth/ShareCode";
import { useAppUI } from "@/components/ui/AppUI";
import { Avatar, Chip, PillButton, ScreenHeader, Skeleton } from "@/components/ui/bits";
import { uploadPhoto } from "@/lib/media";
import { signOut, useSession } from "@/lib/session";
import { resetDemo, setMe, updateProfile, useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import type { Profile, SavedItem } from "@/lib/types";

const count = (items: SavedItem[], pred: (i: SavedItem) => boolean) => items.filter((i) => i.status === "done" && pred(i)).length;
const EMOJIS = ["🧢", "🌿", "🦊", "🐻", "🌻", "🍄", "🐙", "🌙", "🍒", "🎧", "🪴", "🐸"];

export default function UsPage() {
  const { ready, items, profiles, meId, memories } = useStore();
  const session = useSession();
  const theme = useTheme();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!ready) {
    return (
      <main>
        <ScreenHeader title="us" subtitle="our little corner" />
        <Skeleton className="h-40" />
      </main>
    );
  }

  const stats = [
    { emoji: "🎉", n: count(items, () => true), label: "things we've done" },
    { emoji: "📍", n: count(items, (i) => i.category === "places" || i.category === "eat"), label: "places visited" },
    { emoji: "🎬", n: count(items, (i) => i.category === "watch"), label: "movies watched" },
    { emoji: "🎨", n: count(items, (i) => i.category === "do"), label: "things tried" },
    { emoji: "✈️", n: count(items, (i) => i.category === "travel"), label: "trips taken" },
    { emoji: "📸", n: memories.length, label: "memories kept" },
    { emoji: "🖼️", n: memories.reduce((sum, m) => sum + m.photos.length, 0), label: "photos kept" },
    { emoji: "📌", n: items.filter((i) => i.status === "saved" || i.status === "planned" || i.status === "maybe").length, label: "still on our list" },
  ];

  const waiting = isSupabaseConfigured && profiles.length < 2;

  return (
    <main className="mx-auto max-w-[640px]">
      <ScreenHeader title="us" subtitle={session.couple?.name ?? "our little corner"} />

      <section aria-label="stats" className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[28px] bg-card p-4 shadow-soft">
            <span aria-hidden className="text-2xl">{s.emoji}</span>
            <p className="mt-2 font-display text-4xl font-bold leading-none tracking-tight">{s.n}</p>
            <p className="mt-1 text-sm text-mute">{s.label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="games-h" className="mt-8">
        <h2 id="games-h" className="px-1 font-display text-2xl font-bold tracking-tight">games</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[["🔤", "guess the word", "guess"], ["🕵️", "who saved this?", "who"], ["📷", "remember when?", "remember"]].map(([e, l, t]) => (
            <Link key={t} href={`/games?tab=${t}`} className="flex flex-col items-center gap-2 rounded-[24px] bg-card px-2 py-4 text-center shadow-soft active:scale-95">
              <span aria-hidden className="text-3xl">{e}</span>
              <span className="text-[13px] font-medium leading-tight">{l}</span>
            </Link>
          ))}
        </div>
        <Link href="/draw" className="mt-3 flex h-14 items-center gap-3 rounded-[24px] bg-card px-5 shadow-soft active:scale-[0.99]"><span aria-hidden className="text-2xl">🎨</span><span className="font-semibold">the drawing board</span></Link>
      </section>

      <section aria-labelledby="look-h" className="mt-8">
        <h2 id="look-h" className="px-1 font-display text-2xl font-bold tracking-tight">look</h2>
        <div className="mt-3 flex gap-2" role="group" aria-label="theme">
          {(["auto", "light", "dark"] as ThemeChoice[]).map((t) => (
            <Chip key={t} active={theme === t} onClick={() => setTheme(t)}>
              {t === "auto" ? "match my phone" : t}
            </Chip>
          ))}
        </div>
      </section>

      <section aria-labelledby="who-h" className="mt-8">
        <h2 id="who-h" className="px-1 font-display text-2xl font-bold tracking-tight">{isSupabaseConfigured ? "the two of us" : "who's here"}</h2>
        <div className="mt-3 space-y-3">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              editable={!isSupabaseConfigured || p.id === meId}
              isMe={p.id === meId}
              onSwitch={isSupabaseConfigured ? undefined : () => setMe(p.id)}
            />
          ))}
          {waiting && session.couple && (
            <div className="rounded-[28px] border-2 border-dashed border-ink/15 p-4">
              <p className="font-semibold">waiting for your person 💌</p>
              <p className="mb-3 mt-1 text-sm text-mute">send them this code. they sign up, pick &ldquo;I have a code&rdquo;, and they&apos;re in.</p>
              <ShareCode code={session.couple.inviteCode} />
            </div>
          )}
        </div>
        {!isSupabaseConfigured && <p className="mt-2 px-1 text-sm text-mute">new things you save are credited to whoever&apos;s selected.</p>}
      </section>

      <section className="mt-8 rounded-[28px] bg-card p-5 shadow-soft" aria-label="space">
        <h2 className="font-display text-xl font-bold tracking-tight">{isSupabaseConfigured ? "private space" : "demo mode"}</h2>
        {isSupabaseConfigured ? (
          <>
            <p className="mt-1 text-[15px] text-mute">
              only the two of you can see what&apos;s here — photos included. signed in as <span className="font-medium text-ink">{session.email}</span>.
            </p>
            <PillButton tone="ghost" className="mt-4" onClick={() => void signOut()}>sign out</PillButton>
          </>
        ) : (
          <>
            <p className="mt-1 text-[15px] text-mute">everything is saved on this device only. connect Supabase to share it between your two phones.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {confirmReset ? (
                <>
                  <PillButton tone="ghost" onClick={() => setConfirmReset(false)}>keep ours</PillButton>
                  <PillButton className="!bg-[#c4432b]" onClick={() => { resetDemo(); setConfirmReset(false); }}>reset to demo data</PillButton>
                </>
              ) : (
                <PillButton tone="ghost" onClick={() => setConfirmReset(true)}>reset demo data</PillButton>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function ProfileCard({ profile, editable, isMe, onSwitch }: { profile: Profile; editable: boolean; isMe: boolean; onSwitch?: () => void }) {
  const { toast } = useAppUI();
  const { couple } = useSession();
  const [name, setName] = useState(profile.name);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const saveName = () => {
    const v = name.trim() || profile.name;
    setName(v);
    if (v !== profile.name) updateProfile(profile.id, { name: v });
  };

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      updateProfile(profile.id, { photo: await uploadPhoto(f, couple?.id ?? null, "avatars") });
      toast("looking good", "📸");
    } catch {
      toast("couldn't add that photo", "🫠");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <div className="rounded-[28px] bg-card p-3 shadow-soft">
      <div className="flex items-center gap-3">
        {editable ? (
          <button type="button" onClick={() => file.current?.click()} disabled={busy} aria-label={`change ${profile.name}'s photo`} className="relative rounded-full">
            <Avatar profile={profile} size={56} />
            <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] text-on-ink">
              {busy ? "…" : "📷"}
            </span>
          </button>
        ) : (
          <Avatar profile={profile} size={56} />
        )}
        <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        {editable ? (
          <label className="min-w-0 flex-1">
            <span className="sr-only">name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="h-11 w-full rounded-full bg-transparent px-2 font-semibold outline-none focus:bg-ink/[0.05]"
            />
          </label>
        ) : (
          <p className="min-w-0 flex-1 truncate px-2 font-semibold">{profile.name}</p>
        )}
        {onSwitch ? (
          <Chip active={isMe} onClick={onSwitch}>{isMe ? "that's me" : "I'm this"}</Chip>
        ) : isMe ? (
          <span className="rounded-full bg-ink/[0.06] px-3 py-1.5 text-xs font-semibold">you</span>
        ) : null}
      </div>

      {editable && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 px-1 text-xs font-medium text-mute">{profile.photo ? "or go back to an emoji" : "no photo? pick an emoji"}</p>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`use ${e}`}
                aria-pressed={!profile.photo && profile.avatar === e}
                onClick={() => updateProfile(profile.id, { avatar: e, photo: "" })}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${!profile.photo && profile.avatar === e ? "bg-ink/[0.1]" : "bg-ink/[0.04]"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
