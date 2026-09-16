import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCommunityUrl, routineShareUrl } from "../src/logic/endpoints";

test("Android release never silently connects to the phone's loopback address", () => {
  assert.equal(resolveCommunityUrl(undefined), "");
  assert.equal(resolveCommunityUrl(undefined, undefined, "192.168.1.5"), "http://192.168.1.5:8082");
  assert.equal(resolveCommunityUrl(undefined, "http://localhost:8081"), "http://localhost:8082");
  assert.equal(resolveCommunityUrl(" https://api.example.com/ "), "https://api.example.com");
  assert.throws(() => resolveCommunityUrl("https://user:password@example.com"));
  assert.throws(() => resolveCommunityUrl("file:///data"));
});

test("shared routines prefer an HTTPS web preview and preserve the native deep link fallback", () => {
  assert.equal(routineShareUrl("abc", undefined, "akhyles://shared-routine?id=abc"), "akhyles://shared-routine?id=abc");
  assert.equal(routineShareUrl("a&b", "https://gym.example.com/", "unused"), "https://gym.example.com/shared-routine?id=a%26b");
  assert.throws(() => routineShareUrl("abc", "http://gym.example.com", "unused"));
});
