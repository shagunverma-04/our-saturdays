// Guards + parsing for the link-preview endpoint. Pure (no Next imports) so it can be unit-tested.
// The threat: a "fetch this URL for me" endpoint can be pointed at internal addresses (SSRF). So: only
// public http(s) hosts, no odd ports, redirects re-checked at every hop, tiny timeouts and size caps.

import dns from "node:dns/promises";
import net from "node:net";

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (/^f[cd]/.test(l) || /^fe[89ab]/.test(l)) return true; // unique-local, link-local
    const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  return true; // not an IP we understand → refuse
}

export async function assertPublicUrl(u: URL, lookup: typeof dns.lookup = dns.lookup): Promise<void> {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("only http(s) links");
  if (u.username || u.password) throw new Error("no credentials in links");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("unusual port");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("private host");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("private address");
    return;
  }
  const addrs = await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("private address");
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
export const decodeEntities = (s: string) =>
  s
    .replace(/&(amp|quot|apos|lt|gt|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

/** Pull a title/image/site name out of raw HTML using OpenGraph, Twitter card, or <title>. */
export function parseMeta(html: string, base: URL): { title?: string; image?: string; site?: string } {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    if (key && content && !(key in meta)) meta[key] = decodeEntities((content[1] ?? content[2] ?? "").trim());
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = (meta["og:title"] || meta["twitter:title"] || (titleTag ? decodeEntities(titleTag.replace(/\s+/g, " ").trim()) : "")).slice(0, 160) || undefined;
  let image: string | undefined;
  const rawImg = meta["og:image"] || meta["twitter:image"];
  if (rawImg) {
    try {
      const u = new URL(rawImg, base);
      if (u.protocol === "http:" || u.protocol === "https:") image = u.toString();
    } catch {
      /* ignore bad image url */
    }
  }
  return { title, image, site: meta["og:site_name"] || undefined };
}

/** "…/maps/place/Clay+Station/@12.9,77.6…" → "Clay Station" (free: it's right there in the URL). */
export function mapsPlaceName(u: URL): string | undefined {
  const m = /\/maps\/place\/([^/@?]+)/.exec(u.pathname);
  if (m) {
    try {
      return decodeURIComponent(m[1].replace(/\+/g, " ")).trim() || undefined;
    } catch {
      return undefined;
    }
  }
  const q = u.searchParams.get("q") || u.searchParams.get("query");
  return q && !/^-?\d+(\.\d+)?,\s*-?\d+/.test(q) ? q.trim() : undefined;
}

export const isMapsHost = (u: URL) => u.hostname === "maps.app.goo.gl" || u.hostname === "goo.gl" || u.hostname === "maps.google.com" || (/^(www\.)?google\.[a-z.]+$/.test(u.hostname) && u.pathname.startsWith("/maps"));
export const isYouTubeHost = (u: URL) => /(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === "youtu.be";
/** We never fetch these: no scraping of private-ish social content. We only keep the link. */
export const isNoFetchHost = (u: URL) => /(^|\.)(instagram\.com|tiktok\.com|facebook\.com|fb\.watch)$/.test(u.hostname);

const UA = "Mozilla/5.0 (compatible; OurSaturdays/1.0; private couple app)";

/** fetch() that re-checks EVERY redirect hop against the private-address guard, with a timeout. */
export async function safeFetch(start: URL, opts: { accept?: string; timeoutMs?: number; hops?: number } = {}): Promise<{ res: Response; finalUrl: URL }> {
  let u = start;
  for (let i = 0; i <= (opts.hops ?? 4); i++) {
    await assertPublicUrl(u);
    const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(opts.timeoutMs ?? 4500), headers: { "user-agent": UA, accept: opts.accept ?? "text/html,application/xhtml+xml" } });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      u = new URL(loc, u);
      continue;
    }
    return { res, finalUrl: u };
  }
  throw new Error("too many redirects");
}

/** Read at most `max` bytes of a response body as text. */
export async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (got >= max) {
      await reader.cancel();
      break;
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}
