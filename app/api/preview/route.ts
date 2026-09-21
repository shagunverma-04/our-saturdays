import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isMapsHost, isNoFetchHost, isYouTubeHost, mapsPlaceName, parseMeta, readCapped as readBody, safeFetch } from "@/lib/preview-safe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 300_000;

/** Only signed-in members may use this, so it can't become an open "fetch anything" proxy. */
async function authorized(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return process.env.NODE_ENV !== "production"; // demo mode on a dev machine only
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await createClient(url, key, { auth: { persistSession: false } }).auth.getUser(token);
  return !error && Boolean(data.user);
}

export async function GET(req: Request) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let target: URL;
  try {
    target = new URL(new URL(req.url).searchParams.get("url") ?? "");
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  const headers = { "cache-control": "private, max-age=600" };
  try {
    if (isNoFetchHost(target)) return NextResponse.json({}, { headers });

    if (isYouTubeHost(target)) {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target.toString())}`, { signal: AbortSignal.timeout(4500) });
      if (!r.ok) return NextResponse.json({}, { headers });
      const j = (await r.json()) as { title?: string; thumbnail_url?: string };
      return NextResponse.json({ title: j.title?.slice(0, 160), image: j.thumbnail_url, site: "YouTube" }, { headers });
    }

    const { res, finalUrl } = await safeFetch(target);
    if (isMapsHost(target) || isMapsHost(finalUrl)) {
      const name = mapsPlaceName(finalUrl);
      return NextResponse.json({ title: name, location: name, site: "Google Maps" }, { headers });
    }
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return NextResponse.json({}, { headers });
    return NextResponse.json(parseMeta(await readBody(res, MAX_BYTES), finalUrl), { headers });
  } catch {
    return NextResponse.json({}, { headers }); // a preview is a nicety; never an error the user has to deal with
  }
}
