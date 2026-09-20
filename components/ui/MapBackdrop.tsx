import { cn } from "@/lib/utils";

/** Decorative soft street-map: parks, water, roads. Pure SVG, no tiles, no API. */
export function MapBackdrop({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={cn("absolute inset-0 h-full w-full", className)}>
      <rect width="400" height="300" style={{ fill: "var(--map-land)" }} />
      {/* park + water */}
      <path d="M-10 200 C60 170 90 230 160 215 C230 200 240 260 300 250 L300 320 L-10 320 Z" style={{ fill: "var(--map-park)" }} />
      <path d="M270 -10 C300 40 350 30 410 70 L410 -10 Z" style={{ fill: "var(--map-water)" }} />
      <ellipse cx="70" cy="60" rx="46" ry="30" style={{ fill: "var(--map-park)" }} />
      {/* roads */}
      <g fill="none" strokeLinecap="round" style={{ stroke: "var(--map-road)" }}>
        <path d="M-10 120 C80 100 160 150 260 120 S380 90 420 110" strokeWidth="14" />
        <path d="M120 -10 C130 60 110 140 140 210 S150 290 160 320" strokeWidth="12" />
        <path d="M300 -10 C280 70 320 150 290 240 S330 300 340 320" strokeWidth="10" />
        <path d="M-10 250 L200 190 L420 240" strokeWidth="7" />
        <path d="M200 60 L420 40" strokeWidth="6" />
      </g>
      <g fill="none" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" style={{ stroke: "var(--map-dash)" }}>
        <path d="M-10 120 C80 100 160 150 260 120 S380 90 420 110" />
        <path d="M120 -10 C130 60 110 140 140 210 S150 290 160 320" />
      </g>
    </svg>
  );
}
