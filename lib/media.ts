"use client";

// Private photos. In shared mode files live in a NON-public Supabase bucket ("media") under <couple_id>/…;
// the database only stores a reference like "sb:<couple_id>/<file>.jpg". The browser gets short-lived signed
// URLs, so a leaked link stops working. In demo mode photos are small data-URLs kept on the device.

import { useEffect, useState } from "react";
import { blobToDataUrl, shrinkImage } from "./image";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";

const BUCKET = "media";
const PREFIX = "sb:";
const TTL = 3600; // seconds a signed URL lives
const REFRESH_MARGIN = 120_000; // ms before expiry we stop trusting a cached URL

export const isStoredRef = (ref: string) => ref.startsWith(PREFIX);

/** Resize + upload a photo. Returns the reference to store on the row (or a data URL in demo mode). */
export async function uploadPhoto(file: File, coupleId: string | null, folder = "photos"): Promise<string> {
  const blob = await shrinkImage(file, isSupabaseConfigured ? 1400 : 900, isSupabaseConfigured ? 0.8 : 0.72);
  if (!isSupabaseConfigured || !coupleId) return blobToDataUrl(blob);
  const path = `${coupleId}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600" });
  if (error) throw new Error(error.message);
  return PREFIX + path;
}

/** Upload a finished drawing as a lossless PNG (a JPEG would smudge the lines). */
export async function uploadDrawing(blob: Blob, coupleId: string | null): Promise<string> {
  if (!isSupabaseConfigured || !coupleId) return blobToDataUrl(blob);
  const path = `${coupleId}/drawings/${crypto.randomUUID()}.png`;
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, blob, { contentType: "image/png", cacheControl: "3600" });
  if (error) throw new Error(error.message);
  return PREFIX + path;
}

/** Best-effort cleanup of a replaced/removed photo. */
export async function deletePhoto(ref: string): Promise<void> {
  if (!isStoredRef(ref) || !isSupabaseConfigured) return;
  cache.delete(ref);
  await getSupabase().storage.from(BUCKET).remove([ref.slice(PREFIX.length)]);
}

// ---- signed-URL cache with batching ----------------------------------------

const cache = new Map<string, { url: string; exp: number }>();
let queue = new Map<string, Array<(url: string) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  const batch = queue;
  queue = new Map();
  timer = null;
  const refs = [...batch.keys()];
  getSupabase()
    .storage.from(BUCKET)
    .createSignedUrls(refs.map((r) => r.slice(PREFIX.length)), TTL)
    .then(({ data }) => {
      const exp = Date.now() + TTL * 1000;
      refs.forEach((ref, i) => {
        const url = data?.[i]?.signedUrl ?? "";
        if (url) cache.set(ref, { url, exp });
        batch.get(ref)!.forEach((cb) => cb(url));
      });
    })
    .catch(() => refs.forEach((ref) => batch.get(ref)!.forEach((cb) => cb(""))));
}

function resolve(ref: string, cb: (url: string) => void) {
  const hit = cache.get(ref);
  if (hit && hit.exp - Date.now() > REFRESH_MARGIN) return cb(hit.url);
  const waiting = queue.get(ref) ?? [];
  waiting.push(cb);
  queue.set(ref, waiting);
  timer ??= setTimeout(flush, 12); // one request for every image on screen
}

function cached(ref: string): string {
  const hit = cache.get(ref);
  return hit && hit.exp - Date.now() > REFRESH_MARGIN ? hit.url : "";
}

/** Turn a stored reference into something an <img> can show. Non-stored refs (data URLs, https links) pass through. */
export function useMediaUrl(ref: string): string {
  const stored = isStoredRef(ref);
  const [signed, setSigned] = useState<{ ref: string; url: string } | null>(null);

  useEffect(() => {
    if (!stored || cached(ref)) return;
    let live = true;
    resolve(ref, (url) => live && setSigned({ ref, url }));
    return () => {
      live = false;
    };
  }, [ref, stored]);

  if (!stored) return ref;
  return cached(ref) || (signed?.ref === ref ? signed.url : "");
}
