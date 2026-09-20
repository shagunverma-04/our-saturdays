"use client";

// Hand-drawn glossy "3D object" icons, pure SVG (no assets, no downloads, crisp at any size).
// Each is built the way a render is: a base form, a light-to-dark gradient for volume, darker
// shading on the far side, and small specular highlights.

import { useId } from "react";
import type { CategoryId } from "@/lib/types";

type P = { p: string }; // unique id prefix so gradient ids never collide when an icon appears many times

// ---- chrome star (all) ------------------------------------------------------

const STAR = (() => {
  const cx = 50, cy = 54, R = 40, r = 19;
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)] as const;
  });
  const shrink = (pt: readonly [number, number], k: number) => [cx + (pt[0] - cx) * k, cy + (pt[1] - cy) * k] as const;
  const shades = ["#ffffff", "#aab2c2", "#eef1f7", "#7b8393", "#dfe4ee", "#9aa2b3", "#f6f8fc", "#687083", "#e6eaf3", "#b5bccb"];
  const facets = pts.map((pt, i) => {
    const a = shrink(pt, 0.9), b = shrink(pts[(i + 1) % 10], 0.9);
    return { d: `M${cx} ${cy} L${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)} Z`, fill: shades[i] };
  });
  return { outline: pts.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" "), facets };
})();

function Star({ p }: P) {
  return (
    <>
      <defs>
        <linearGradient id={`${p}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f9ff" />
          <stop offset="0.5" stopColor="#b9c0cf" />
          <stop offset="1" stopColor="#6f7788" />
        </linearGradient>
        <radialGradient id={`${p}p`} cx="0.3" cy="0.75" r="0.6">
          <stop offset="0" stopColor="#ff9bd0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9bd0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}c`} cx="0.75" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#7fe4ff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#7fe4ff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${p}k`}>
          <polygon points={STAR.outline} />
        </clipPath>
      </defs>
      <polygon points={STAR.outline} fill={`url(#${p}a)`} stroke={`url(#${p}a)`} strokeWidth="8" strokeLinejoin="round" />
      <g clipPath={`url(#${p}k)`}>
        {STAR.facets.map((f, i) => (
          <path key={i} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth="0.6" strokeLinejoin="round" />
        ))}
        <rect width="100" height="100" fill={`url(#${p}p)`} />
        <rect width="100" height="100" fill={`url(#${p}c)`} />
      </g>
      <ellipse cx="38" cy="34" rx="7" ry="3.2" transform="rotate(-38 38 34)" fill="#fff" opacity="0.9" />
      <circle cx="62" cy="70" r="1.6" fill="#fff" opacity="0.8" />
    </>
  );
}

// ---- sushi roll (eat) -------------------------------------------------------

function Sushi({ p }: P) {
  return (
    <>
      <defs>
        <linearGradient id={`${p}n`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4a4d" />
          <stop offset="0.35" stopColor="#1c1c1e" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
        <linearGradient id={`${p}r`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe1e6" />
        </linearGradient>
        <linearGradient id={`${p}f`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ff7a55" />
          <stop offset="0.6" stopColor="#f0402a" />
          <stop offset="1" stopColor="#c8261a" />
        </linearGradient>
      </defs>
      {/* nori sides (the roll's body, seen slightly from above) */}
      <rect x="14" y="30" width="72" height="58" rx="20" fill={`url(#${p}n)`} />
      <path d="M22 44 C20 60 22 74 28 82" stroke="#fff" strokeOpacity="0.25" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* rice face */}
      <rect x="15" y="14" width="70" height="62" rx="21" fill={`url(#${p}r)`} />
      <rect x="15" y="14" width="70" height="62" rx="21" fill="none" stroke="#c9ccd3" strokeWidth="1.2" />
      {/* filling */}
      <rect x="27" y="24" width="46" height="42" rx="15" fill="#b8220f" opacity="0.35" transform="translate(0 2.5)" />
      <rect x="27" y="24" width="46" height="42" rx="15" fill={`url(#${p}f)`} />
      {/* salmon sheen */}
      <path d="M36 32 C44 28 56 28 64 33" stroke="#ffd0bd" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M34 44 L46 40 M40 54 L58 46 M50 58 L64 52" stroke="#ff9b7d" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="24" cy="24" rx="5" ry="2.4" transform="rotate(-35 24 24)" fill="#fff" />
    </>
  );
}

// ---- coffee cup (places) ----------------------------------------------------

function Cup({ p }: P) {
  const body = "M26 30 L74 30 L67.5 89 Q67 92 64 92 L36 92 Q33 92 32.5 89 Z";
  return (
    <>
      <defs>
        <linearGradient id={`${p}w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f0f2f5" />
          <stop offset="1" stopColor="#c6cbd4" />
        </linearGradient>
        <linearGradient id={`${p}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dcb684" />
          <stop offset="0.5" stopColor="#c69660" />
          <stop offset="1" stopColor="#94683a" />
        </linearGradient>
        <linearGradient id={`${p}l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4b4b4f" />
          <stop offset="0.4" stopColor="#1d1d1f" />
          <stop offset="1" stopColor="#060607" />
        </linearGradient>
        <clipPath id={`${p}k`}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={`url(#${p}w)`} />
      <g clipPath={`url(#${p}k)`}>
        <rect x="20" y="47" width="60" height="29" fill={`url(#${p}s)`} />
        <rect x="20" y="47" width="60" height="1.6" fill="#7a5530" opacity="0.6" />
        <rect x="20" y="74.6" width="60" height="1.6" fill="#7a5530" opacity="0.6" />
        {/* the sleeve's bold little logo */}
        <g fill="#21150c">
          <rect x="35" y="53" width="8" height="8" rx="3.6" />
          <rect x="45" y="52" width="9" height="9" rx="4" />
          <rect x="56" y="53" width="8" height="8" rx="3.6" />
          <rect x="38" y="63" width="9" height="8" rx="3.6" />
          <rect x="49" y="63" width="12" height="8" rx="3.8" />
        </g>
        <rect x="28" y="30" width="6" height="62" fill="#fff" opacity="0.55" />
      </g>
      {/* lid */}
      <path d="M22 24 Q22 20 26 20 L74 20 Q78 20 78 24 L77 31 L23 31 Z" fill={`url(#${p}l)`} />
      <rect x="27" y="12" width="46" height="11" rx="5" fill={`url(#${p}l)`} />
      <rect x="31" y="14.5" width="18" height="2.2" rx="1.1" fill="#fff" opacity="0.4" />
      <rect x="25" y="23" width="6" height="1.8" rx="0.9" fill="#fff" opacity="0.28" />
    </>
  );
}

// ---- disco ball (do / go out) ----------------------------------------------

const DISCO = (() => {
  const cx = 50, cy = 55, R = 36, tilt = 0.38;
  const L = (() => { const v = [-0.5, -0.65, 0.58]; const n = Math.hypot(...v); return v.map((x) => x / n); })();
  const rnd = (i: number, j: number) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const proj = (lat: number, lon: number) => {
    const x = Math.cos(lat) * Math.sin(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon);
    return { x, y: y * Math.cos(tilt) - z * Math.sin(tilt), z: y * Math.sin(tilt) + z * Math.cos(tilt) };
  };
  const rad = (d: number) => (d * Math.PI) / 180;
  const tiles: { d: string; fill: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -90 + i * 18, b = a + 18;
    for (let j = 0; j < 13; j++) {
      const la = -96 + j * 16, lb = la + 16;
      const m = proj(rad((a + b) / 2), rad((la + lb) / 2));
      if (m.z < 0.04) continue;
      const corners = [proj(rad(a), rad(la)), proj(rad(a), rad(lb)), proj(rad(b), rad(lb)), proj(rad(b), rad(la))];
      const d = corners.map((c, k) => `${k ? "L" : "M"}${(cx + R * c.x).toFixed(1)} ${(cy - R * c.y).toFixed(1)}`).join("") + "Z";
      const lit = Math.max(0, m.x * L[0] + m.y * L[1] + m.z * L[2]);
      const v = rnd(i, j);
      const g = 58 + 205 * Math.pow(lit, 0.95) + (v - 0.5) * 80;
      const warm = v > 0.6 ? 26 : v < 0.25 ? -12 : 6;
      const cool = v < 0.25 ? 20 : 0;
      const c = (n: number) => Math.max(8, Math.min(250, Math.round(n)));
      tiles.push({ d, fill: `rgb(${c(g + warm)},${c(g + warm * 0.5)},${c(g + cool)})` });
    }
  }
  return tiles;
})();

function Disco({ p }: P) {
  return (
    <>
      <defs>
        <radialGradient id={`${p}v`} cx="0.42" cy="0.38" r="0.62">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={`${p}m`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2f2f5" />
          <stop offset="1" stopColor="#7e828c" />
        </linearGradient>
        <clipPath id={`${p}k`}>
          <circle cx="50" cy="55" r="36" />
        </clipPath>
      </defs>
      <circle cx="50" cy="55" r="36" fill="#1a1a1c" />
      <g clipPath={`url(#${p}k)`}>
        {DISCO.map((t, i) => (
          <path key={i} d={t.d} fill={t.fill} stroke="#111113" strokeWidth="0.55" strokeLinejoin="round" />
        ))}
        <circle cx="50" cy="55" r="36" fill={`url(#${p}v)`} />
      </g>
      <ellipse cx="36" cy="38" rx="6" ry="3" transform="rotate(-42 36 38)" fill="#fff" opacity="0.85" />
      {/* hanging cap */}
      <rect x="44" y="12" width="12" height="8" rx="3" fill={`url(#${p}m)`} />
      <rect x="49.2" y="5" width="1.6" height="8" rx="0.8" fill="#9a9ea8" />
    </>
  );
}

// ---- handbag (shop) ---------------------------------------------------------

function Bag({ p }: P) {
  const body = "M14 56 C14 42 26 38 50 38 C74 38 86 42 86 56 L86 68 C86 80 76 89 64 89 L36 89 C24 89 14 80 14 68 Z";
  return (
    <>
      <defs>
        <linearGradient id={`${p}b`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#f6fdfd" />
          <stop offset="0.5" stopColor="#cfe6e7" />
          <stop offset="1" stopColor="#93b9bd" />
        </linearGradient>
        <linearGradient id={`${p}h`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#eaf6f6" />
          <stop offset="1" stopColor="#8fb3b7" />
        </linearGradient>
        <clipPath id={`${p}k`}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* handles */}
      <path d="M31 42 C25 4 75 4 69 42" fill="none" stroke={`url(#${p}h)`} strokeWidth="7" strokeLinecap="round" />
      <path d="M31 42 C26 7 74 7 69 42" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" transform="translate(0 -1)" />
      <path d={body} fill={`url(#${p}b)`} />
      <g clipPath={`url(#${p}k)`}>
        <ellipse cx="50" cy="94" rx="50" ry="14" fill="#5f8a90" opacity="0.35" />
        <path d="M14 54 C34 46 66 46 86 54" fill="none" stroke="#6f9aa0" strokeOpacity="0.7" strokeWidth="1.6" />
        <path d="M14 56.6 C34 48.6 66 48.6 86 56.6" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.2" />
      </g>
      <ellipse cx="50" cy="51" rx="3" ry="2.4" fill="#e8f3f4" stroke="#7fa4a9" strokeWidth="1.2" />
      <ellipse cx="32" cy="66" rx="14" ry="5.5" transform="rotate(-24 32 66)" fill="#fff" opacity="0.6" />
    </>
  );
}

// ---- hotel bell (travel) ----------------------------------------------------

function Bell({ p }: P) {
  const dome = "M16 72 C16 49 31 39 50 39 C69 39 84 49 84 72 Z";
  return (
    <>
      <defs>
        <linearGradient id={`${p}d`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d94a1" />
          <stop offset="0.18" stopColor="#f7f9fc" />
          <stop offset="0.36" stopColor="#aab1bd" />
          <stop offset="0.55" stopColor="#eef1f6" />
          <stop offset="0.8" stopColor="#8a919e" />
          <stop offset="1" stopColor="#5a606c" />
        </linearGradient>
        <linearGradient id={`${p}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe3ea" />
          <stop offset="1" stopColor="#7d8492" />
        </linearGradient>
        <clipPath id={`${p}k`}>
          <path d={dome} />
        </clipPath>
      </defs>
      <ellipse cx="50" cy="80" rx="44" ry="8.5" fill={`url(#${p}p)`} />
      <ellipse cx="50" cy="76.5" rx="43" ry="7.5" fill="#eef1f6" />
      <ellipse cx="50" cy="75.5" rx="36" ry="4.6" fill="#b4bac6" opacity="0.5" />
      <path d={dome} fill={`url(#${p}d)`} />
      <g clipPath={`url(#${p}k)`}>
        <rect x="16" y="64" width="68" height="9" fill="#4d5361" opacity="0.28" />
        <path d="M26 68 C24 55 31 46 42 42" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85" />
      </g>
      <rect x="46.5" y="30" width="7" height="10" fill={`url(#${p}p)`} />
      <ellipse cx="50" cy="29" rx="8" ry="3.4" fill={`url(#${p}d)`} />
      <ellipse cx="50" cy="26.4" rx="5.4" ry="3" fill="#f2f4f8" />
      <ellipse cx="48.4" cy="25.6" rx="2" ry="0.9" fill="#fff" />
    </>
  );
}

// ---- clapperboard (watch) ---------------------------------------------------

function Clapper({ p }: P) {
  return (
    <>
      <defs>
        <linearGradient id={`${p}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#56565b" />
          <stop offset="0.4" stopColor="#242427" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
        <clipPath id={`${p}k`}>
          <rect x="14" y="20" width="72" height="15" rx="4" />
        </clipPath>
      </defs>
      <rect x="14" y="38" width="72" height="48" rx="8" fill={`url(#${p}b)`} />
      <rect x="22" y="50" width="30" height="3.4" rx="1.7" fill="#fff" opacity="0.85" />
      <rect x="22" y="59" width="44" height="3.4" rx="1.7" fill="#fff" opacity="0.55" />
      <rect x="22" y="68" width="22" height="3.4" rx="1.7" fill="#fff" opacity="0.4" />
      <path d="M18 42 L18 80" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      {/* the clapper arm, raised */}
      <g transform="rotate(-11 14 36)">
        <rect x="14" y="20" width="72" height="15" rx="4" fill="#0d0d0f" />
        <g clipPath={`url(#${p}k)`} fill="#f3f4f7">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${20 + i * 15} 20 L${29 + i * 15} 20 L${21 + i * 15} 35 L${12 + i * 15} 35 Z`} />
          ))}
          <rect x="14" y="20" width="72" height="3" fill="#fff" opacity="0.35" />
        </g>
      </g>
      <circle cx="14" cy="36" r="2.4" fill="#9ca0aa" />
    </>
  );
}

// ---- light bulb (ideas) -----------------------------------------------------

function Bulb({ p }: P) {
  return (
    <>
      <defs>
        <radialGradient id={`${p}g`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset="0.4" stopColor="#ffe873" />
          <stop offset="1" stopColor="#f2a800" />
        </radialGradient>
        <linearGradient id={`${p}m`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f5f6f8" />
          <stop offset="0.5" stopColor="#a5abb6" />
          <stop offset="1" stopColor="#6a707c" />
        </linearGradient>
      </defs>
      <path d="M50 8 C28 8 17 25 17 41 C17 54 25 60 31 69 L31 75 L69 75 L69 69 C75 60 83 54 83 41 C83 25 72 8 50 8 Z" fill={`url(#${p}g)`} />
      <path d="M40 62 L40 48 L46 54 L50 46 L54 54 L60 48 L60 62" fill="none" stroke="#c98a00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="30" y="75" width="40" height="7" rx="3.5" fill={`url(#${p}m)`} />
      <rect x="32" y="82" width="36" height="6.5" rx="3.2" fill={`url(#${p}m)`} />
      <rect x="37" y="88" width="26" height="6" rx="3" fill={`url(#${p}m)`} />
      <ellipse cx="34" cy="28" rx="8" ry="13" transform="rotate(24 34 28)" fill="#fff" opacity="0.7" />
      <circle cx="26" cy="46" r="2" fill="#fff" opacity="0.8" />
    </>
  );
}

const ICONS: Record<CategoryId | "all", (props: P) => React.JSX.Element> = {
  all: Star,
  eat: Sushi,
  places: Cup,
  do: Disco,
  shop: Bag,
  travel: Bell,
  watch: Clapper,
  ideas: Bulb,
};

export function Icon3D({ category, className, style }: { category: CategoryId | "all"; className?: string; style?: React.CSSProperties }) {
  const p = useId().replace(/:/g, "");
  const Art = ICONS[category];
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false" className={className} style={style}>
      <Art p={p} />
    </svg>
  );
}
