import assert from "node:assert/strict";
import test from "node:test";
import { markVisualVocabularyMastered, parseVisualVocabularyProgress, } from "../../src/imported/services/local-visual-vocabulary-progress";
test("visual vocabulary progress keeps only unique known entry ids", () => {
    assert.deepEqual(parseVisualVocabularyProgress({
        masteredEntryIds: ["apple", "apple", "unknown", 42],
        lastPracticedAt: "2026-11-08T10:00:00.000Z",
    }), {
        masteredEntryIds: ["apple"],
        lastPracticedAt: "2026-11-08T10:00:00.000Z",
    });
});
test("visual vocabulary progress safely handles malformed stored data", () => {
    assert.deepEqual(parseVisualVocabularyProgress(null), {
        masteredEntryIds: [],
        lastPracticedAt: null,
    });
    assert.deepEqual(parseVisualVocabularyProgress({
        masteredEntryIds: ["unknown"],
        lastPracticedAt: "not-a-date",
    }), {
        masteredEntryIds: [],
        lastPracticedAt: null,
    });
});
test("mastery is recorded once per vocabulary entry and ignores unknown ids", () => {
    const initial = { masteredEntryIds: [], lastPracticedAt: null };
    const first = markVisualVocabularyMastered(initial, "apple", new Date("2026-11-08T10:00:00.000Z"));
    const repeated = markVisualVocabularyMastered(first, "apple", new Date("2026-11-08T10:05:00.000Z"));
    const unknown = markVisualVocabularyMastered(repeated, "not-in-catalogue");
    assert.deepEqual(repeated.masteredEntryIds, ["apple"]);
    assert.deepEqual(unknown, repeated);
    assert.equal(repeated.lastPracticedAt, "2026-11-08T10:05:00.000Z");
});
