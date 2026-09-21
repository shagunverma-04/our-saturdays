"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useAppUI } from "@/components/ui/AppUI";
import { PillButton } from "@/components/ui/bits";
import { addPoint, ASPECT, COLORS, drawAll, exportPng, hasInk, PAPER, SIZES, type Stroke } from "@/lib/drawing";
import { uploadDrawing } from "@/lib/media";
import { useSession } from "@/lib/session";
import { addDrawing } from "@/lib/store";
import { useShared } from "@/lib/useShared";
import { cn } from "@/lib/utils";

/** A little canvas to doodle on and send. Strokes are kept as data (not pixels), so undo is exact and it looks the same on any screen. */
export function DrawingBoard({ onSent }: { onSent: () => void }) {
  const { toast } = useAppUI();
  const { couple } = useSession();
  const { partner } = useShared();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const raf = useRef(0);
  const [width, setWidth] = useState(0);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [size, setSize] = useState<number>(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const [inkCount, setInkCount] = useState(0); // re-renders when strokes are added/removed (undo/send buttons)
  const [sure, setSure] = useState(false);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);

  const paint = useCallback(() => {
    const el = canvas.current;
    if (!el || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const h = Math.round(width * ASPECT);
    if (el.width !== Math.round(width * dpr)) {
      el.width = Math.round(width * dpr);
      el.height = Math.round(h * dpr);
    }
    const ctx = el.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAll(ctx, current.current ? [...strokes.current, current.current] : strokes.current, width, h);
  }, [width]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(paint, [paint]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const schedule = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(paint);
  };
  const at = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width];
  };

  const down = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = at(e);
    current.current = { color: eraser ? PAPER : color, size: eraser ? size * 2.4 : size, points: [[x, y]] };
    schedule();
  };
  const move = (e: RPointerEvent<HTMLCanvasElement>) => {
    const s = current.current;
    if (!s) return;
    // coalesced events = every point the finger actually passed through, not just one per frame
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of evs.length ? evs : [e.nativeEvent]) {
      const [x, y] = at(ev);
      addPoint(s, x, y);
    }
    schedule();
  };
  const up = () => {
    const s = current.current;
    if (!s) return;
    current.current = null;
    strokes.current.push(s);
    setInkCount(strokes.current.length);
    setSure(false);
    schedule();
  };

  const undo = () => {
    strokes.current.pop();
    setInkCount(strokes.current.length);
    schedule();
  };
  const clear = () => {
    if (!sure) return setSure(true);
    strokes.current = [];
    setInkCount(0);
    setSure(false);
    schedule();
  };

  const send = async () => {
    if (!hasInk(strokes.current) || sending) return;
    setSending(true);
    try {
      const image = await uploadDrawing(await exportPng(strokes.current), couple?.id ?? null);
      addDrawing({ image, caption: caption.trim() });
      toast(partner ? `sent to ${partner.name}` : "saved", "🎨");
      onSent();
    } catch {
      toast("couldn't send that. try again?", "🫠");
      setSending(false);
    }
  };

  const swatch = "h-9 w-9 shrink-0 rounded-full border-2 border-black/10 transition-transform active:scale-90";

  return (
    <div className="mx-auto max-w-[520px]">
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-3" role="toolbar" aria-label="drawing tools">
        {COLORS.map((c) => (
          <button key={c} type="button" aria-label={`pen colour ${c}`} aria-pressed={!eraser && color === c} onClick={() => { setColor(c); setEraser(false); }} className={cn(swatch, !eraser && color === c && "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-paper")} style={{ background: c }} />
        ))}
        <button type="button" aria-label="eraser" aria-pressed={eraser} onClick={() => setEraser((v) => !v)} className={cn(swatch, "flex items-center justify-center bg-card text-base", eraser && "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-paper")}>🧽</button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {SIZES.map((s, i) => (
          <button key={s} type="button" aria-label={["thin", "medium", "thick"][i] + " brush"} aria-pressed={size === s} onClick={() => setSize(s)} className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-soft", size === s && "ring-2 ring-ink")}>
            <span className="rounded-full bg-ink" style={{ width: 4 + i * 6, height: 4 + i * 6 }} />
          </button>
        ))}
        <span className="flex-1" />
        <PillButton tone="ghost" onClick={undo} disabled={inkCount === 0} aria-label="undo">↶ undo</PillButton>
        <PillButton tone={sure ? "ink" : "ghost"} onClick={clear} disabled={inkCount === 0} aria-label="clear the board">{sure ? "sure?" : "clear"}</PillButton>
      </div>

      <div ref={wrap} className="w-full overflow-hidden rounded-[28px] shadow-float" style={{ background: PAPER }}>
        <canvas
          ref={canvas}
          role="img"
          aria-label="drawing board: draw with your finger or mouse"
          className="block w-full cursor-crosshair"
          style={{ touchAction: "none", height: width ? Math.round(width * ASPECT) : undefined }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>

      <div className="mt-4 space-y-3">
        <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 120))} placeholder="say something? (optional)" aria-label="caption" className="h-14 w-full rounded-[20px] bg-card px-4 shadow-soft outline-none placeholder:text-mute/80 focus:ring-2 focus:ring-ink/20" />
        <PillButton size="lg" className="w-full" disabled={inkCount === 0 || sending} onClick={send}>
          {sending ? "sending…" : partner ? `send to ${partner.name} 🎨` : "save it 🎨"}
        </PillButton>
      </div>
    </div>
  );
}
