import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_PHRASES } from "../src/content/initial-phrases";
import { VISUAL_VOCABULARY } from "../src/content/visual-vocabulary";
import { getNextLearningActivity } from "../src/services/next-learning-activity";
import type { LocalLearningProgress } from "../src/types/learning";
import { EMPTY_VISUAL_VOCABULARY_PROGRESS } from "../src/services/local-visual-vocabulary-progress";

const now = new Date("2026-11-08T12:00:00.000Z");
function progress(overrides: Partial<LocalLearningProgress> = {}): LocalLearningProgress {
  return {
    completedPhraseIds: [],
    reviewedPhraseIds: [],
    reviewSchedule: {},
    reviewHistory: [],
    ...overrides,
  };
}
function schedule(dueAt: string, lastReviewedAt = "2026-11-08T10:00:00.000Z") {
  return { repetitions: 1, intervalDays: 1, dueAt, lastReviewedAt, lapses: 0 };
}

test("prioritizes an overdue phrase over visual vocabulary and new lessons", () => {
  const result = getNextLearningActivity(
    progress({ reviewSchedule: { "greeting-hello": schedule("2026-11-08T11:00:00.000Z") } }),
    EMPTY_VISUAL_VOCABULARY_PROGRESS,
    now,
  );
  assert.deepEqual(result, { kind: "review", phraseId: "greeting-hello", reason: "due" });
});

test("prioritizes a difficult due phrase and labels it accurately", () => {
  const result = getNextLearningActivity(
    progress({
      reviewSchedule: {
        "greeting-hello": schedule("2026-11-08T11:30:00.000Z", "2026-11-08T11:50:00.000Z"),
        "food-coffee": schedule("2026-11-08T11:00:00.000Z"),
      },
      reviewHistory: [{
        phraseId: "greeting-hello",
        result: "again",
        reviewedAt: "2026-11-08T11:50:00.000Z",
        dueAt: "2026-11-08T11:30:00.000Z",
        intervalDays: 0,
      }],
    }),
    EMPTY_VISUAL_VOCABULARY_PROGRESS,
    now,
  );
  assert.deepEqual(result, { kind: "review", phraseId: "greeting-hello", reason: "difficult" });
});

test("recommends an unmastered visual concept before starting another phrase lesson", () => {
  const result = getNextLearningActivity(progress(), EMPTY_VISUAL_VOCABULARY_PROGRESS, now);
  assert.deepEqual(result, { kind: "visual", entryId: VISUAL_VOCABULARY[0].id, reason: "new-visual" });
});

test("excludes mastered visual concepts and selects the next catalogue entry", () => {
  const result = getNextLearningActivity(progress(), {
    masteredEntryIds: [VISUAL_VOCABULARY[0].id],
    lastPracticedAt: now.toISOString(),
  }, now);
  assert.deepEqual(result, { kind: "visual", entryId: VISUAL_VOCABULARY[1].id, reason: "new-visual" });
});

test("recommends a new lesson after all visual concepts are mastered", () => {
  const result = getNextLearningActivity(progress(), {
    masteredEntryIds: VISUAL_VOCABULARY.map((entry) => entry.id),
    lastPracticedAt: now.toISOString(),
  }, now);
  assert.deepEqual(result, { kind: "lesson", reason: "new-phrases" });
});

test("returns consolidation only after all validated phrases and visuals are mastered", () => {
  const result = getNextLearningActivity(progress({
    completedPhraseIds: STARTER_PHRASES.map((phrase) => phrase.id),
  }), {
    masteredEntryIds: VISUAL_VOCABULARY.map((entry) => entry.id),
    lastPracticedAt: now.toISOString(),
  }, now);
  assert.deepEqual(result, { kind: "consolidate", reason: "all-mastered" });
});

test("ignores unknown phrase IDs and future review dates", () => {
  const result = getNextLearningActivity(progress({
    reviewSchedule: {
      "not-a-real-phrase": schedule("2026-11-08T10:00:00.000Z"),
      "greeting-hello": schedule("2026-11-09T10:00:00.000Z"),
    },
  }), EMPTY_VISUAL_VOCABULARY_PROGRESS, now);
  assert.equal(result.kind, "visual");
});

test("uses stable catalogue order when due dates and difficulty are equal", () => {
  const result = getNextLearningActivity(progress({
    reviewSchedule: {
      "greeting-morning": schedule("2026-11-08T11:00:00.000Z"),
      "greeting-hello": schedule("2026-11-08T11:00:00.000Z"),
    },
  }), EMPTY_VISUAL_VOCABULARY_PROGRESS, now);
  assert.deepEqual(result, { kind: "review", phraseId: "greeting-hello", reason: "due" });
});

test("uses the latest review timestamp even when history entries are out of order", () => {
  const result = getNextLearningActivity(progress({
    reviewSchedule: {
      "greeting-hello": schedule("2026-11-08T11:55:00.000Z", "2026-11-08T11:50:00.000Z"),
    },
    reviewHistory: [
      {
        phraseId: "greeting-hello",
        result: "again",
        reviewedAt: "2026-11-08T11:50:00.000Z",
        dueAt: "2026-11-08T11:55:00.000Z",
        intervalDays: 0,
      },
      {
        phraseId: "greeting-hello",
        result: "known",
        reviewedAt: "2026-11-08T11:20:00.000Z",
        dueAt: "2026-11-08T11:30:00.000Z",
        intervalDays: 1,
      },
    ],
  }), EMPTY_VISUAL_VOCABULARY_PROGRESS, now);
  assert.deepEqual(result, { kind: "review", phraseId: "greeting-hello", reason: "difficult" });
});

test("does not label a phrase difficult when its latest review was known", () => {
  const result = getNextLearningActivity(progress({
    reviewSchedule: {
      "greeting-hello": schedule("2026-11-08T11:55:00.000Z", "2026-11-08T11:50:00.000Z"),
    },
    reviewHistory: [
      {
        phraseId: "greeting-hello",
        result: "known",
        reviewedAt: "2026-11-08T11:50:00.000Z",
        dueAt: "2026-11-08T11:55:00.000Z",
        intervalDays: 1,
      },
      {
        phraseId: "greeting-hello",
        result: "again",
        reviewedAt: "2026-11-08T11:20:00.000Z",
        dueAt: "2026-11-08T11:30:00.000Z",
        intervalDays: 0,
      },
    ],
  }), EMPTY_VISUAL_VOCABULARY_PROGRESS, now);
  assert.deepEqual(result, { kind: "review", phraseId: "greeting-hello", reason: "due" });
});
