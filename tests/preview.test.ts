import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicUrl, decodeEntities, isNoFetchHost, isPrivateIp, mapsPlaceName, parseMeta } from "../lib/preview-safe.ts";

const fakeLookup = (map: Record<string, string[]>) => (async (host: string) => (map[host] ?? []).map((address) => ({ address, family: address.includes(":") ? 6 : 4 }))) as never;

test("private/internal addresses are refused", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "172.31.255.255", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) assert.equal(isPrivateIp(ip), false, ip);
});

test("assertPublicUrl blocks SSRF shapes, including DNS that resolves inside", async () => {
  const lookup = fakeLookup({ "evil.example": ["10.1.2.3"], "mixed.example": ["8.8.8.8", "127.0.0.1"], "ok.example": ["93.184.216.34"] });
  await assert.rejects(assertPublicUrl(new URL("http://169.254.169.254/latest/meta-data"), lookup), /private/);
  await assert.rejects(assertPublicUrl(new URL("http://localhost:3000/"), lookup), /private|port/);
  await assert.rejects(assertPublicUrl(new URL("http://[::1]/"), lookup), /private/);
  await assert.rejects(assertPublicUrl(new URL("http://evil.example/"), lookup), /private/);
  await assert.rejects(assertPublicUrl(new URL("http://mixed.example/"), lookup), /private/);
  await assert.rejects(assertPublicUrl(new URL("file:///etc/passwd"), lookup), /http/);
  await assert.rejects(assertPublicUrl(new URL("https://user:pw@ok.example/"), lookup), /credentials/);
  await assert.rejects(assertPublicUrl(new URL("https://ok.example:8080/"), lookup), /port/);
  await assert.rejects(assertPublicUrl(new URL("http://printer.local/"), lookup), /private/);
  await assertPublicUrl(new URL("https://ok.example/page"), lookup); // fine
});

test("instagram/tiktok are never fetched", () => {
  for (const u of ["https://www.instagram.com/reel/abc", "https://vm.tiktok.com/xyz", "https://m.facebook.com/x"]) assert.equal(isNoFetchHost(new URL(u)), true, u);
  assert.equal(isNoFetchHost(new URL("https://example.com")), false);
});

test("parseMeta reads OpenGraph, decodes entities, resolves relative images, ignores bad ones", () => {
  const html = `<html><head><title>Fallback &amp; co</title>
    <meta property="og:title" content="Clay Station &amp; Cafe — Pottery">
    <meta property="og:image" content="/img/cover.jpg"><meta property="og:site_name" content='Clay'></head></html>`;
  const m = parseMeta(html, new URL("https://clay.example/studio"));
  assert.deepEqual(m, { title: "Clay Station & Cafe — Pottery", image: "https://clay.example/img/cover.jpg", site: "Clay" });
  assert.equal(parseMeta(`<title> Just   a title </title>`, new URL("https://a.b")).title, "Just a title");
  assert.equal(parseMeta(`<meta property="og:image" content="javascript:alert(1)">`, new URL("https://a.b")).image, undefined);
  assert.equal(parseMeta("", new URL("https://a.b")).title, undefined);
  assert.equal(decodeEntities("a &#39;b&#39; &#x41;"), "a 'b' A");
});

test("maps place names come straight from the URL (no API)", () => {
  assert.equal(mapsPlaceName(new URL("https://www.google.com/maps/place/Clay+Station/@12.9,77.6,17z/data=x")), "Clay Station");
  assert.equal(mapsPlaceName(new URL("https://www.google.com/maps/place/Caf%C3%A9+Roast/@1,2")), "Café Roast");
  assert.equal(mapsPlaceName(new URL("https://www.google.com/maps?q=Toit+Indiranagar")), "Toit Indiranagar");
  assert.equal(mapsPlaceName(new URL("https://www.google.com/maps?q=12.97,77.59")), undefined);
});
