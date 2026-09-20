"use client";

import { useSyncExternalStore } from "react";

export type ThemeChoice = "auto" | "light" | "dark";
const KEY = "our-saturdays:theme";
const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

/** "auto" follows the phone's setting; light/dark force it. Applied to <html data-theme> (see the inline script in layout). */
export function setTheme(t: ThemeChoice) {
  try {
    if (t === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* private mode: still apply for this visit */
  }
  if (t === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  listeners.forEach((l) => l());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    read,
    () => "auto",
  );
}

/** Runs before first paint so there's no light flash on a dark phone. Kept as a string for <script>. */
export const THEME_BOOT = `try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
