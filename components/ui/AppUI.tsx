"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AddSheet } from "@/components/add/AddSheet";
import { dismissNotice, useStore } from "@/lib/store";
import type { CategoryId, SavedItem } from "@/lib/types";

// browser online/offline as a tiny external store
const onlineSub = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

interface AddOptions {
  category?: CategoryId;
  edit?: SavedItem;
}

interface AppUIContextValue {
  openAdd: (opts?: AddOptions) => void;
  toast: (message: string, emoji?: string) => void;
  /** screens can hint which category a fresh "+" should start on */
  setDefaultCategory: (c: CategoryId | undefined) => void;
}

const AppUIContext = createContext<AppUIContextValue | null>(null);

export function useAppUI(): AppUIContextValue {
  const ctx = useContext(AppUIContext);
  if (!ctx) throw new Error("useAppUI must be used inside <AppUIProvider>");
  return ctx;
}

/** Owns the add/edit sheet and the little "saved" toast so any screen can trigger them. */
export function AppUIProvider({ children }: { children: ReactNode }) {
  const [add, setAdd] = useState<{ open: boolean; opts: AddOptions }>({ open: false, opts: {} });
  const [toastState, setToast] = useState<{ id: number; message: string; emoji: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const defaultCategory = useRef<CategoryId | undefined>(undefined);
  const setDefaultCategory = useCallback((c: CategoryId | undefined) => {
    defaultCategory.current = c;
  }, []);
  const openAdd = useCallback((opts: AddOptions = {}) => setAdd({ open: true, opts: { category: defaultCategory.current, ...opts } }), []);
  const closeAdd = useCallback(() => setAdd((a) => ({ ...a, open: false })), []);
  const toast = useCallback((message: string, emoji = "✨") => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message, emoji });
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const { notice } = useStore();
  const noticeId = notice?.id;
  const hasRetry = Boolean(notice?.retry);
  useEffect(() => {
    if (noticeId === undefined) return;
    // a notice offering "retry" stays long enough to reconnect first
    const t = setTimeout(dismissNotice, hasRetry ? 20000 : 6000);
    return () => clearTimeout(t);
  }, [noticeId, hasRetry]);
  const online = useSyncExternalStore(onlineSub, () => navigator.onLine, () => true);

  const value = useMemo(() => ({ openAdd, toast, setDefaultCategory }), [openAdd, toast, setDefaultCategory]);

  return (
    <AppUIContext.Provider value={value}>
      {children}
      <AddSheet open={add.open} onClose={closeAdd} category={add.opts.category} edit={add.opts.edit} />
      {!online && (
        <div role="status" className="fixed inset-x-0 top-0 z-[70] bg-ink px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-[13px] font-medium text-on-ink">
          you&apos;re offline — what&apos;s on screen is what we last loaded. reactions and saves will need a connection.
        </div>
      )}
      {notice && (
        <div role="alert" className="fixed inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
          <div className="glass flex max-w-[420px] items-center gap-3 rounded-full py-2 pl-5 pr-2 text-[14px] font-medium shadow-float">
            <span className="min-w-0 flex-1">{notice.message}</span>
            {notice.retry && (
              <button type="button" onClick={() => { const r = notice.retry; dismissNotice(); r?.(); }} className="h-9 shrink-0 rounded-full bg-ink px-4 text-[13px] font-semibold text-on-ink">retry</button>
            )}
            <button type="button" onClick={dismissNotice} aria-label="dismiss" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mute">✕</button>
          </div>
        </div>
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
        <AnimatePresence>
          {toastState && (
            <motion.div
              key={toastState.id}
              initial={{ y: -30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="glass flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold shadow-float"
            >
              <span aria-hidden>{toastState.emoji}</span>
              {toastState.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppUIContext.Provider>
  );
}
