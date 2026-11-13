import assert from "node:assert/strict";
import test from "node:test";
import { isTutorOriginAllowed } from "../../../reference/mobile-provider-tests/api/_lib/tutor-origin";

test("allows explicitly configured application origins", () => {
  assert.equal(isTutorOriginAllowed("https://app.example.com", "api.example.com", ["https://app.example.com"]), true);
});

test("allows same-origin browser requests without an allowlist entry", () => {
  assert.equal(isTutorOriginAllowed("https://elovio.example.com", "elovio.example.com", []), true);
});

test("rejects cross-origin requests not in the allowlist", () => {
  assert.equal(isTutorOriginAllowed("https://attacker.example", "elovio.example.com", []), false);
  assert.equal(isTutorOriginAllowed("not-a-url", "elovio.example.com", []), false);
});

test("does not infer same-origin when the request host is unavailable", () => {
  assert.equal(isTutorOriginAllowed("https://elovio.example.com", undefined, []), false);
});
