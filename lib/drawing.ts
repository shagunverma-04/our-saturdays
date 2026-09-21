// The drawing engine, kept apart from React: strokes are stored in board units (0..1 across the width), so the same
// drawing renders identically on a phone, a tablet, and in the exported PNG.

export interface Stroke {
  color: string;
  size: number; // brush width as a fraction of the board width (e.g. 0.012)
  points: Array<[number, number]>; // [x, y] in board units; y is measured in widths too (so a 4:5 board is 0..1.25 tall)
}

export const PAPER = "#fffdf8";
export const ASPECT = 1.25; // height / width of the board

export const COLORS = ["#1c1c1a", "#e5484d", "#f5a524", "#f7d84a", "#30a46c", "#3e63dd", "#8e4ec6", "#ff8fb1"] as const;
export const SIZES = [0.006, 0.012, 0.026] as const;

type Ctx = Pick<CanvasRenderingContext2D, "beginPath" | "moveTo" | "lineTo" | "quadraticCurveTo" | "stroke" | "arc" | "fill" | "fillRect" | "save" | "restore"> & { strokeStyle: unknown; fillStyle: unknown; lineWidth: number; lineCap: unknown; lineJoin: unknown };

/** Draw one stroke: a dot for a tap, smooth curves (through midpoints) for a drag. `w` = board width in pixels. */
export function drawStroke(ctx: Ctx, stroke: Stroke, w: number): void {
  const pts = stroke.points;
  if (!pts.length) return;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.size * w);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0] * w, pts[0][1] * w, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * w, pts[0][1] * w);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i][0] + pts[i + 1][0]) / 2) * w;
    const my = ((pts[i][1] + pts[i + 1][1]) / 2) * w;
    ctx.quadraticCurveTo(pts[i][0] * w, pts[i][1] * w, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0] * w, last[1] * w);
  ctx.stroke();
}

export function drawAll(ctx: Ctx, strokes: Stroke[], w: number, h: number): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  for (const s of strokes) drawStroke(ctx, s, w);
}

/** Skip points that add nothing (finger jitter) so strokes stay small and smooth. */
export function addPoint(stroke: Stroke, x: number, y: number, minDist = 0.002): boolean {
  const last = stroke.points[stroke.points.length - 1];
  if (last && Math.hypot(x - last[0], y - last[1]) < minDist) return false;
  stroke.points.push([x, y]);
  return true;
}

/** True when there's something worth sending. */
export const hasInk = (strokes: Stroke[]) => strokes.some((s) => s.points.length > 0);

/** Render at a fixed export width (crisp, but not huge) into a PNG blob. */
export function exportPng(strokes: Stroke[], exportWidth = 1000): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = exportWidth;
  canvas.height = Math.round(exportWidth * ASPECT);
  drawAll(canvas.getContext("2d")!, strokes, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not encode drawing"))), "image/png"));
}
