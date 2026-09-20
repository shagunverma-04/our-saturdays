"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AddSheet } from "@/components/add/AddSheet";
import type { CategoryId, SavedItem } from "@/lib/types";

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

  const value = useMemo(() => ({ openAdd, toast, setDefaultCategory }), [openAdd, toast, setDefaultCategory]);

  return (
    <AppUIContext.Provider value={value}>
      {children}
      <AddSheet open={add.open} onClose={closeAdd} category={add.opts.category} edit={add.opts.edit} />
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
