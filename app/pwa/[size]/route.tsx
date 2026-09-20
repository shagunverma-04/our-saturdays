import { ImageResponse } from "next/og";

// PWA icon drawn from shapes only (no fonts/emoji, so it renders offline and at build time).
export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ size: "180" }, { size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = Math.min(1024, Math.max(64, Number.parseInt(size, 10) || 512));
  const u = px / 100;

  return new ImageResponse(
    (
      <div style={{ width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center", background: "#1c1c1a" }}>
        {/* sun */}
        <div style={{ position: "absolute", width: 46 * u, height: 46 * u, borderRadius: 999, background: "#ffd24a", top: 20 * u, left: 27 * u, display: "flex" }} />
        {/* horizon: the saturday */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 34 * u, background: "#f5f4f0", display: "flex", borderTopLeftRadius: 60 * u, borderTopRightRadius: 60 * u }} />
        {/* pin */}
        <div style={{ position: "absolute", width: 16 * u, height: 16 * u, borderRadius: 999, background: "#1c1c1a", bottom: 26 * u, left: 42 * u, display: "flex" }} />
      </div>
    ),
    { width: px, height: px },
  );
}
