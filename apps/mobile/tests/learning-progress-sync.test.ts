import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeLearningProgressSnapshots,
  parseLearningProgressSnapshot,
} from "../src/services/learning-progress-snapshot";

const empty = { schemaVersion: 1, learning: { completedPhraseIds: [], reviewedPhraseIds: [], reviewSchedule: {}, reviewHistory: [] }, visualVocabulary: { masteredEntryIds: [], lastPracticedAt: null }, studyDays: [] };

test("progress snapshot parser rejects unknown ids and malformed values", () => {
  const parsed = parseLearningProgressSnapshot({
    learning: { completedPhraseIds: ["greeting-hello", "invalid"], reviewedPhraseIds: ["invalid"], reviewSchedule: {}, reviewHistory: [] },
    visualVocabulary: { masteredEntryIds: ["apple", "invalid"], lastPracticedAt: "bad-date" },
    studyDays: [{ date: "2026-11-08", seconds: 10 }, { date: "bad", seconds: 50 }],
  });
  assert.deepEqual(parsed.learning.completedPhraseIds, ["greeting-hello"]);
  assert.deepEqual(parsed.learning.reviewedPhraseIds, []);
  assert.deepEqual(parsed.visualVocabulary, { masteredEntryIds: ["apple"], lastPracticedAt: null });
  assert.deepEqual(parsed.studyDays, [{ date: "2026-11-08", seconds: 10 }]);
});

test("snapshot merge unions mastery and phrases and keeps the latest review schedule", () => {
  const merged = mergeLearningProgressSnapshots({
    ...empty,
    learning: {
      completedPhraseIds: ["greeting-hello"],
      reviewedPhraseIds: ["greeting-hello"],
      reviewSchedule: { "greeting-hello": { repetitions: 2, intervalDays: 3, dueAt: "2026-11-11T00:00:00.000Z", lastReviewedAt: "2026-11-08T00:00:00.000Z", lapses: 0 } },
      reviewHistory: [{ phraseId: "greeting-hello", result: "known", reviewedAt: "2026-11-08T00:00:00.000Z", dueAt: "2026-11-11T00:00:00.000Z", intervalDays: 3 }],
    },
    visualVocabulary: { masteredEntryIds: ["apple"], lastPracticedAt: "2026-11-08T00:00:00.000Z" },
    studyDays: [{ date: "2026-11-08", seconds: 120 }],
  }, {
    ...empty,
    learning: {
      completedPhraseIds: ["greeting-morning"],
      reviewedPhraseIds: ["greeting-hello", "greeting-morning"],
      reviewSchedule: { "greeting-hello": { repetitions: 1, intervalDays: 1, dueAt: "2026-11-09T00:00:00.000Z", lastReviewedAt: "2026-11-07T00:00:00.000Z", lapses: 0 } },
      reviewHistory: [{ phraseId: "greeting-hello", result: "known", reviewedAt: "2026-11-08T00:00:00.000Z", dueAt: "2026-11-11T00:00:00.000Z", intervalDays: 3 }],
    },
    visualVocabulary: { masteredEntryIds: ["dog"], lastPracticedAt: "2026-11-07T00:00:00.000Z" },
    studyDays: [{ date: "2026-11-08", seconds: 90 }, { date: "2026-11-07", seconds: 60 }],
  });
  assert.deepEqual(merged.learning.completedPhraseIds.sort(), ["greeting-hello", "greeting-morning"]);
  assert.equal(merged.learning.reviewSchedule["greeting-hello"]?.repetitions, 2);
  assert.equal(merged.learning.reviewHistory.length, 1);
  assert.deepEqual(merged.visualVocabulary.masteredEntryIds.sort(), ["apple", "dog"]);
  assert.equal(merged.visualVocabulary.lastPracticedAt, "2026-11-08T00:00:00.000Z");
  assert.deepEqual(merged.studyDays, [{ date: "2026-11-07", seconds: 60 }, { date: "2026-11-08", seconds: 120 }]);
});

test("empty local state preserves progress already stored in the account", () => {
  const merged = mergeLearningProgressSnapshots(empty, {
    ...empty,
    learning: { ...empty.learning, completedPhraseIds: ["greeting-hello"] },
  });
  assert.deepEqual(merged.learning.completedPhraseIds, ["greeting-hello"]);
});

test("a newer difficult review removes an older mastered phrase during sync", () => {
  const known = {
    ...empty,
    learning: {
      completedPhraseIds: ["greeting-hello"],
      reviewedPhraseIds: ["greeting-hello"],
      reviewSchedule: { "greeting-hello": { repetitions: 2, intervalDays: 3, dueAt: "2026-11-09T00:10:00.000Z", lastReviewedAt: "2026-11-09T00:00:00.000Z", lapses: 0 } },
      reviewHistory: [],
    },
  };
  const difficult = {
    ...empty,
    learning: {
      completedPhraseIds: [],
      reviewedPhraseIds: ["greeting-hello"],
      reviewSchedule: { "greeting-hello": { repetitions: 0, intervalDays: 0, dueAt: "2026-11-09T00:20:00.000Z", lastReviewedAt: "2026-11-09T00:10:00.000Z", lapses: 1 } },
      reviewHistory: [],
    },
  };
  const merged = mergeLearningProgressSnapshots(known, difficult);
  assert.deepEqual(merged.learning.completedPhraseIds, []);
  assert.equal(merged.learning.reviewSchedule["greeting-hello"]?.lapses, 1);
});
