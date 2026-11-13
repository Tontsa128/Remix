import assert from "node:assert/strict";
import test from "node:test";
import { resolveContentLanguage } from "../../src/imported/services/content-language";
test("content language preserves all supported learning catalogue languages", () => {
    assert.equal(resolveContentLanguage("fi"), "fi");
    assert.equal(resolveContentLanguage("es"), "es");
    assert.equal(resolveContentLanguage("en"), "en");
});
test("content language falls back safely when a translation is not in the catalogue", () => {
    assert.equal(resolveContentLanguage("sv"), "fi");
    assert.equal(resolveContentLanguage("sv", "es"), "es");
});
