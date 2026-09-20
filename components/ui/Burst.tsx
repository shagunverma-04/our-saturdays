"use client";

import { motion } from "framer-motion";

const BITS = ["✨", "🫶", "🎉", "✨", "💛", "🎊", "✨", "🫶"];

/** A small, one-shot celebration. Mount it to play it. */
export function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {BITS.map((b, i) => {
        const angle = (i / BITS.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute text-xl"
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: Math.cos(angle) * 84, y: Math.sin(angle) * 64 - 10, opacity: 0, scale: 1.1, rotate: (i % 2 ? 1 : -1) * 40 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {b}
          </motion.span>
        );
      })}
    </span>
  );
}
