// Read the date a photo was TAKEN from its EXIF metadata. Pure and dependency-free (works on bytes), so it's
// unit-tested. We only read the date — never GPS — and it's read from the ORIGINAL file before the app shrinks it
// (the stored copy is re-encoded, so it carries no EXIF at all: no location leaks out with your photos).

const u16 = (v: DataView, o: number, le: boolean) => v.getUint16(o, le);
const u32 = (v: DataView, o: number, le: boolean) => v.getUint32(o, le);

/** "2026:09:17 14:03:22" → "2026-09-17". Rejects zeros, junk, and dates from the future or before digital cameras. */
export function exifDateToISO(raw: string, now = new Date()): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getMonth() !== mo - 1) return null; // e.g. feb 31
  if (dt.getTime() > now.getTime() + 86_400_000) return null; // camera clocks set wrong
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function readAscii(v: DataView, o: number, len: number): string {
  let s = "";
  for (let i = 0; i < len && o + i < v.byteLength; i++) {
    const c = v.getUint8(o + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/** Returns the raw EXIF date string ("YYYY:MM:DD HH:MM:SS") or null. Handles JPEG, both byte orders. */
export function readExifDateString(bytes: Uint8Array): string | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.byteLength < 12 || v.getUint16(0) !== 0xffd8) return null; // not a JPEG

  // find the APP1 "Exif" segment
  let off = 2, tiff = -1;
  while (off + 4 < v.byteLength) {
    if (v.getUint8(off) !== 0xff) return null;
    const marker = v.getUint8(off + 1);
    if (marker === 0xda || marker === 0xd9) break; // start of scan / end: no more metadata
    const len = v.getUint16(off + 2);
    if (marker === 0xe1 && off + 10 < v.byteLength && readAscii(v, off + 4, 4) === "Exif") {
      tiff = off + 10;
      break;
    }
    off += 2 + len;
  }
  if (tiff < 0) return null;

  const order = v.getUint16(tiff);
  const le = order === 0x4949;
  if (!le && order !== 0x4d4d) return null;
  if (u16(v, tiff + 2, le) !== 0x2a) return null;

  const dateAt = (entryOff: number): string | null => {
    // ASCII field: count bytes; if > 4 the value lives at an offset from the TIFF header
    const count = u32(v, entryOff + 4, le);
    const valueOff = count > 4 ? tiff + u32(v, entryOff + 8, le) : entryOff + 8;
    if (valueOff + count > v.byteLength) return null;
    return readAscii(v, valueOff, count);
  };

  /** Scan one IFD for the wanted tags. Returns { date tags found, exif sub-IFD pointer }. */
  const scan = (ifdOff: number) => {
    const found: Record<number, string> = {};
    let exifPtr = -1;
    if (ifdOff < 0 || ifdOff + 2 > v.byteLength) return { found, exifPtr };
    const n = u16(v, ifdOff, le);
    for (let i = 0; i < n && i < 512; i++) {
      const e = ifdOff + 2 + i * 12;
      if (e + 12 > v.byteLength) break;
      const tag = u16(v, e, le);
      if (tag === 0x8769) exifPtr = tiff + u32(v, e + 8, le);
      else if (tag === 0x9003 || tag === 0x9004 || tag === 0x0132) {
        const s = dateAt(e);
        if (s) found[tag] = s;
      }
    }
    return { found, exifPtr };
  };

  const ifd0 = scan(tiff + u32(v, tiff + 4, le));
  const sub = scan(ifd0.exifPtr);
  // original capture time > digitized time > file-modified time
  return sub.found[0x9003] ?? sub.found[0x9004] ?? ifd0.found[0x0132] ?? null;
}

export function readPhotoDateFromBytes(bytes: Uint8Array, now = new Date()): string | null {
  try {
    const raw = readExifDateString(bytes);
    return raw ? exifDateToISO(raw, now) : null;
  } catch {
    return null; // a weird file is never an error the user sees
  }
}

/** Browser wrapper: the metadata sits at the very start of the file, so 256 KB is plenty. */
export async function readPhotoDate(file: Blob): Promise<string | null> {
  const buf = await file.slice(0, 262_144).arrayBuffer();
  return readPhotoDateFromBytes(new Uint8Array(buf));
}

/** The earliest valid date among several (a trip's photos → the day it started). */
export function earliest(dates: Array<string | null>): string | null {
  const ok = dates.filter((d): d is string => Boolean(d)).sort();
  return ok[0] ?? null;
}
