import assert from "node:assert/strict";
import test from "node:test";
import { addPoint, drawAll, drawStroke, hasInk, PAPER, type Stroke } from "../lib/drawing.ts";

// a recording stand-in for a canvas context
function rec() {
  const calls: Array<[string, ...number[]]> = [];
  const ctx = {
    strokeStyle: "" as unknown, fillStyle: "" as unknown, lineWidth: 0, lineCap: "" as unknown, lineJoin: "" as unknown,
    beginPath: () => calls.push(["begin"]), moveTo: (x: number, y: number) => calls.push(["move", x, y]), lineTo: (x: number, y: number) => calls.push(["line", x, y]),
    quadraticCurveTo: (a: number, b: number, c: number, d: number) => calls.push(["curve", a, b, c, d]), stroke: () => calls.push(["stroke"]),
    arc: (x: number, y: number, r: number) => calls.push(["arc", x, y, r]), fill: () => calls.push(["fill"]), fillRect: (...a: number[]) => calls.push(["fillRect", ...a]),
    save: () => {}, restore: () => {},
  };
  return { ctx, calls };
}
const stroke = (points: Array<[number, number]>, size = 0.01, color = "#000"): Stroke => ({ color, size, points });

test("a tap becomes a dot, sized by the brush and the board width", () => {
  const { ctx, calls } = rec();
  drawStroke(ctx, stroke([[0.5, 0.25]], 0.02, "#e5484d"), 1000);
  assert.deepEqual(calls, [["begin"], ["arc", 500, 250, 10], ["fill"]]);
  assert.equal(ctx.fillStyle, "#e5484d");
  assert.equal(ctx.lineWidth, 20);
});

test("a drag is drawn as smooth curves through midpoints, ending at the last point", () => {
  const { ctx, calls } = rec();
  drawStroke(ctx, stroke([[0, 0], [0.1, 0], [0.2, 0.1], [0.3, 0.1]]), 100);
  assert.deepEqual(calls[0], ["begin"]);
  assert.deepEqual(calls[1], ["move", 0, 0]);
  assert.equal(calls.filter((c) => c[0] === "curve").length, 2);
  assert.deepEqual(calls[calls.length - 2], ["line", 30, 10]);
  assert.deepEqual(calls[calls.length - 1], ["stroke"]);
  const two = rec(); drawStroke(two.ctx, stroke([[0, 0], [0.5, 0.5]]), 100);
  assert.deepEqual(two.calls.map((c) => c[0]), ["begin", "move", "line", "stroke"], "two points = a straight line");
});

test("empty strokes draw nothing; hairline brushes never vanish", () => {
  const { ctx, calls } = rec();
  drawStroke(ctx, stroke([]), 1000);
  assert.deepEqual(calls, []);
  drawStroke(ctx, stroke([[0, 0], [1, 1]], 0.000001), 100);
  assert.equal(ctx.lineWidth, 1);
});

test("the paper is painted first, then every stroke in order", () => {
  const { ctx, calls } = rec();
  drawAll(ctx, [stroke([[0.1, 0.1]], 0.01, "#111"), stroke([[0.9, 0.9]], 0.01, "#222")], 400, 500);
  assert.deepEqual(calls[0], ["fillRect", 0, 0, 400, 500]);
  assert.equal(calls.filter((c) => c[0] === "arc").length, 2);
  assert.match(PAPER, /^#/);
});

test("jitter is ignored, real movement is kept", () => {
  const s = stroke([]);
  assert.equal(addPoint(s, 0.5, 0.5), true);
  assert.equal(addPoint(s, 0.5005, 0.5), false, "0.0005 apart is finger noise");
  assert.equal(addPoint(s, 0.52, 0.5), true);
  assert.equal(s.points.length, 2);
});

test("ink detection: blank board is not worth sending", () => {
  assert.equal(hasInk([]), false);
  assert.equal(hasInk([stroke([])]), false);
  assert.equal(hasInk([stroke([[0.1, 0.1]])]), true);
});
