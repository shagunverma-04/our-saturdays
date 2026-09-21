import { NextResponse } from "next/server";
import { callerOf } from "@/lib/authRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Place name → coordinates, via OpenStreetMap's free Nominatim service (no key, no account). Signed-in members only, and the
 * host is fixed, so this can't be pointed elsewhere. The app asks once per place and saves the answer, which keeps us well
 * inside Nominatim's usage policy (about one request a second).
 */
export async function GET(req: Request) {
  const authorized = (await callerOf(req)) !== null || (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== "production");
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 2) return NextResponse.json({});
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": "OurSaturdays/1.0 (private couple app)", "accept-language": "en" },
    });
    if (!r.ok) return NextResponse.json({});
    const [hit] = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const lat = Number(hit?.lat), lon = Number(hit?.lon);
    return NextResponse.json(hit && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, name: hit.display_name } : {}, { headers: { "cache-control": "private, max-age=86400" } });
  } catch {
    return NextResponse.json({});
  }
}
