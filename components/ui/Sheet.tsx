"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet: slides up, drags down from the handle to dismiss, Esc closes, body scroll locked. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* outer element owns the slide in/out; inner owns the drag, so they never fight over `y` */}
          <motion.div
            className="relative w-full max-w-[520px]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="flex max-h-[92dvh] w-full flex-col rounded-t-[32px] bg-paper shadow-float sm:rounded-[32px]"
              drag="y"
              dragControls={controls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              dragSnapToOrigin
              onDragEnd={onDragEnd}
            >
              {/* only the handle starts a drag, so scrolling the form never fights the gesture */}
              <div className="flex h-9 shrink-0 cursor-grab touch-none items-center justify-center" onPointerDown={(e) => controls.start(e)} aria-hidden>
                <span className="h-1.5 w-10 rounded-full bg-ink/15" />
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
