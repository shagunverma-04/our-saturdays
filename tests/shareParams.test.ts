import assert from "node:assert/strict";
import test from "node:test";
import { linkFromSearch } from "../lib/shareParams.ts";

test("properly encoded links (Android share target)", () => {
  assert.equal(linkFromSearch("?url=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1%26y%3D2&title=Hi"), "https://example.com/a?x=1&y=2");
});

test("raw, unencoded links from an iPhone Shortcut keep their & parts", () => {
  assert.equal(linkFromSearch("?url=https://www.youtube.com/watch?v=abc&t=42s"), "https://www.youtube.com/watch?v=abc&t=42s");
  assert.equal(linkFromSearch("?url=https://www.instagram.com/reel/Cx/?igsh=abc&utm_source=qr"), "https://www.instagram.com/reel/Cx/?igsh=abc&utm_source=qr");
});

test("Android's extra text/title params are not swallowed into the link", () => {
  assert.equal(linkFromSearch("?url=https://example.com/p&text=look%20at%20this&title=Cool"), "https://example.com/p");
});

test("the link can arrive in text (share sheets often do this)", () => {
  assert.equal(linkFromSearch("?text=check%20this%20https%3A%2F%2Fwww.instagram.com%2Freel%2Fabc%2F%20so%20cute"), "https://www.instagram.com/reel/abc/");
  assert.equal(linkFromSearch("?title=x&text=see%20https://maps.app.goo.gl/AbC123."), "https://maps.app.goo.gl/AbC123");
});

test("nothing usable → null", () => {
  assert.equal(linkFromSearch(""), null);
  assert.equal(linkFromSearch("?title=hello&text=no%20link%20here"), null);
  assert.equal(linkFromSearch("?url=notalink"), null);
});
