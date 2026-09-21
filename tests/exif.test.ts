import assert from "node:assert/strict";
import test from "node:test";
import { earliest, exifDateToISO, readExifDateString, readPhotoDateFromBytes } from "../lib/exif.ts";

// Build a minimal but REAL JPEG: SOI + APP1(Exif TIFF with the given tags) + a tiny fake scan.
function jpegWithExif(opts: { le?: boolean; ifd0Date?: string; exifOriginal?: string; exifDigitized?: string; inline?: boolean } = {}): Uint8Array {
  const le = opts.le ?? true;
  const w16 = (n: number) => (le ? [n & 255, n >> 8] : [n >> 8, n & 255]);
  const w32 = (n: number) => (le ? [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255] : [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255]);
  const ascii = (s: string) => [...Buffer.from(s + "\0", "latin1")];

  // layout: header(8) | IFD0 | ExifIFD | string data
  const ifd0Tags: Array<{ tag: number; str?: string; ptr?: boolean }> = [];
  if (opts.ifd0Date) ifd0Tags.push({ tag: 0x0132, str: opts.ifd0Date });
  ifd0Tags.push({ tag: 0x8769, ptr: true });
  const exifTags: Array<{ tag: number; str: string }> = [];
  if (opts.exifOriginal) exifTags.push({ tag: 0x9003, str: opts.exifOriginal });
  if (opts.exifDigitized) exifTags.push({ tag: 0x9004, str: opts.exifDigitized });

  const ifd0Size = 2 + ifd0Tags.length * 12 + 4;
  const exifSize = 2 + exifTags.length * 12 + 4;
  const exifOff = 8 + ifd0Size;
  const dataOff = exifOff + exifSize;

  const dataBlocks: number[] = [];
  const entryBytes = (tag: number, str: string) => {
    const bytes = ascii(str);
    const inline = bytes.length <= 4;
    let value: number[];
    if (inline) value = [...bytes, 0, 0, 0, 0].slice(0, 4);
    else {
      value = w32(dataOff + dataBlocks.length);
      dataBlocks.push(...bytes);
    }
    return [...w16(tag), ...w16(2), ...w32(bytes.length), ...value];
  };

  const ifd0: number[] = [...w16(ifd0Tags.length)];
  for (const t of ifd0Tags) ifd0.push(...(t.ptr ? [...w16(t.tag), ...w16(4), ...w32(1), ...w32(exifOff)] : entryBytes(t.tag, t.str!)));
  ifd0.push(...w32(0));
  const exif: number[] = [...w16(exifTags.length)];
  for (const t of exifTags) exif.push(...entryBytes(t.tag, t.str));
  exif.push(...w32(0));

  const tiff = [...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...w16(0x2a), ...w32(8), ...ifd0, ...exif, ...dataBlocks];
  const app1Payload = [...Buffer.from("Exif\0\0", "latin1"), ...tiff];
  const app1 = [0xff, 0xe1, (app1Payload.length + 2) >> 8, (app1Payload.length + 2) & 255, ...app1Payload];
  return new Uint8Array([0xff, 0xd8, ...app1, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
}

const NOW = new Date("2026-09-24T10:00:00");

test("reads DateTimeOriginal (little- and big-endian)", () => {
  for (const le of [true, false]) {
    assert.equal(readPhotoDateFromBytes(jpegWithExif({ le, exifOriginal: "2026:09:17 14:03:22" }), NOW), "2026-09-17", `le=${le}`);
  }
});

test("prefers original capture time over digitized over file-modified", () => {
  assert.equal(readPhotoDateFromBytes(jpegWithExif({ ifd0Date: "2026:09:20 10:00:00", exifDigitized: "2026:09:19 10:00:00", exifOriginal: "2026:09:18 10:00:00" }), NOW), "2026-09-18");
  assert.equal(readPhotoDateFromBytes(jpegWithExif({ ifd0Date: "2026:09:20 10:00:00", exifDigitized: "2026:09:19 10:00:00" }), NOW), "2026-09-19");
  assert.equal(readPhotoDateFromBytes(jpegWithExif({ ifd0Date: "2026:09:20 10:00:00" }), NOW), "2026-09-20");
});

test("no EXIF, not a JPEG, truncated, or garbage → null, never a throw", () => {
  assert.equal(readPhotoDateFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), NOW), null);
  assert.equal(readPhotoDateFromBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8, 9]), NOW), null);
  assert.equal(readPhotoDateFromBytes(new Uint8Array(), NOW), null);
  const good = jpegWithExif({ exifOriginal: "2026:09:17 14:03:22" });
  for (const cut of [5, 12, 20, 30, 45]) assert.doesNotThrow(() => readPhotoDateFromBytes(good.slice(0, cut), NOW), `cut at ${cut}`);
  const noise = new Uint8Array(4000).map((_, i) => (i * 7919) & 255); noise[0] = 0xff; noise[1] = 0xd8;
  assert.doesNotThrow(() => readPhotoDateFromBytes(noise, NOW));
});

test("implausible camera dates are rejected", () => {
  assert.equal(exifDateToISO("0000:00:00 00:00:00", NOW), null);
  assert.equal(exifDateToISO("2026:02:31 10:00:00", NOW), null, "feb 31");
  assert.equal(exifDateToISO("1970:01:01 00:00:00", NOW), null, "unset clock");
  assert.equal(exifDateToISO("2031:01:01 10:00:00", NOW), null, "far future");
  assert.equal(exifDateToISO("2026:09:25 09:00:00", NOW), "2026-09-25", "up to a day ahead is allowed (time zones)");
  assert.equal(exifDateToISO("garbage", NOW), null);
});

test("the date is the LOCAL capture date, not shifted by a time zone", () => {
  assert.equal(exifDateToISO("2026:01:01 00:05:00", new Date("2026-06-01")), "2026-01-01");
  assert.equal(exifDateToISO("2026:12:31 23:59:59", new Date("2027-06-01")), "2026-12-31");
});

test("earliest date of several photos", () => {
  assert.equal(earliest(["2026-09-18", null, "2026-09-02", "2026-09-30"]), "2026-09-02");
  assert.equal(earliest([null, null]), null);
  assert.equal(earliest([]), null);
});

test("raw string reader sees the exact stored text", () => {
  assert.equal(readExifDateString(jpegWithExif({ exifOriginal: "2026:09:17 14:03:22" })), "2026:09:17 14:03:22");
});

// Real JPEGs written by a DIFFERENT EXIF implementation (Pillow), one of them carrying GPS coordinates that we never read.
import { readFileSync } from "node:fs";
test("agrees with an independent EXIF writer on real files (incl. one that also has GPS)", () => {
  const read = (f: string) => readPhotoDateFromBytes(new Uint8Array(readFileSync(new URL(`./fixtures/exif/${f}.jpg`, import.meta.url))), NOW);
  assert.equal(read("taken"), "2026-09-17");
  assert.equal(read("digitized_only"), "2026-08-02");
  assert.equal(read("modified_only"), "2026-07-04");
  assert.equal(read("none"), null);
});
