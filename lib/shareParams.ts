// Reads the link out of a /share?… query string. Pure (no React) so it's unit-tested.
//
// Android's share target sends properly-encoded ?url=…&text=…&title=…. An iPhone Shortcut usually just glues
// the raw link on the end (…/share?url=https://instagram.com/reel/x/?igsh=abc&utm=…), where a normal parser
// would cut the link at the first "&". So: prefer everything after "url=", minus any trailing &text=/&title=.

const URL_RE = /https?:\/\/[^\s<>"']+/i;

function firstUrl(...parts: Array<string | null | undefined>): string | null {
  for (const p of parts) {
    const m = p?.match(URL_RE);
    if (m) return m[0].replace(/[).,;!?]+$/, "");
  }
  return null;
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function linkFromSearch(search: string): string | null {
  const raw = search.replace(/^\?/, "");
  const at = raw.search(/(^|&)url=/);
  if (at !== -1) {
    const rest = raw.slice(raw.indexOf("url=", at) + 4).replace(/&(text|title)=[\s\S]*$/, "");
    const link = firstUrl(safeDecode(rest));
    if (link) return link;
  }
  const q = new URLSearchParams(raw);
  return firstUrl(q.get("url"), q.get("text"), q.get("title"));
}
