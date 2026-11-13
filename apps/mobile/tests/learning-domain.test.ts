
import { getPhraseExplanation, getPhraseText, STARTER_PHRASES } from "../src/content/initial-phrases";
import { LANGUAGES } from "../src/config/languages";
import { getThemePhraseIds, getUnassignedPhraseIds, LESSON_THEMES } from "../src/services/lesson-themes";
import { getLearningLevel } from "../src/services/learning-levels";
import { getLearningGoalProgress } from "../src/services/learning-goals";
import { translations } from "../src/i18n/translations";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LEARNING_PROFILE,
  loadLocalLearningProfile,
  saveLocalLearningProfile,
} from "../src/services/local-learning-profile";
import {
  loadLocalLearningProgress,
  saveLocalLearningProgress,
} from "../src/services/local-learning-progress";
import {
  createReviewQueue,
  getDuePhraseIds,
  recordPhraseReview,
} from "../src/services/spaced-repetition";
import type { LocalLearningProgress } from "../src/types/learning";
import {
  getStudySummary,
  loadStudyDays,
  parseStudyDays,
  recordStudySeconds,
  saveStudyDays,
} from "../src/services/local-learning-activity";

function installStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  return values;
}

function emptyProgress(): LocalLearningProgress {
  return {
    completedPhraseIds: [],
    reviewedPhraseIds: [],
    reviewSchedule: {},
    reviewHistory: [],
  };
}

test("learner profile accepts supported goals and persists them", () => {
  installStorage();
  const profile = { ...DEFAULT_LEARNING_PROFILE, displayName: "Aino", dailyGoalMinutes: 20, weeklyGoalDays: 4 };
  assert.equal(saveLocalLearningProfile(profile), true);
  assert.deepEqual(loadLocalLearningProfile(), profile);
});

test("learner profile rejects invalid goal values", () => {
  installStorage();
  const invalid = { ...DEFAULT_LEARNING_PROFILE, dailyGoalMinutes: 17 };
  assert.equal(saveLocalLearningProfile(invalid), false);
  assert.deepEqual(loadLocalLearningProfile(), DEFAULT_LEARNING_PROFILE);
});

test("legacy progress is loaded with an empty review schedule", () => {
  installStorage({
    "elovio.learning-progress.v1": JSON.stringify({
      completedPhraseIds: ["greeting-hello", "not-a-real-phrase"],
      reviewedPhraseIds: ["greeting-hello"],
    }),
  });
  const progress = loadLocalLearningProgress();
  assert.deepEqual(progress.completedPhraseIds, ["greeting-hello"]);
  assert.deepEqual(progress.reviewedPhraseIds, ["greeting-hello"]);
  assert.deepEqual(progress.reviewSchedule, {});
  assert.deepEqual(progress.reviewHistory, []);
});

test("known phrases follow increasing review intervals", () => {
  const start = new Date("2026-11-07T12:00:00.000Z");
  const first = recordPhraseReview(emptyProgress(), "greeting-hello", true, start);
  assert.equal(first.reviewSchedule["greeting-hello"].intervalDays, 1);
  assert.equal(first.reviewSchedule["greeting-hello"].dueAt, "2026-11-08T12:00:00.000Z");

  const second = recordPhraseReview(
    first,
    "greeting-hello",
    true,
    new Date(first.reviewSchedule["greeting-hello"].dueAt),
  );
  assert.equal(second.reviewSchedule["greeting-hello"].intervalDays, 3);
  assert.equal(second.reviewHistory.length, 2);
  assert.deepEqual(getDuePhraseIds(second, new Date("2026-11-09T12:00:00.000Z")), []);
  assert.deepEqual(getDuePhraseIds(second, new Date("2026-11-11T12:00:00.000Z")), ["greeting-hello"]);
});

test("review session queue stays fixed while answers update due dates", () => {
  const dueDate = new Date("2026-11-10T12:00:00.000Z");
  const reviewedYesterday = new Date("2026-11-09T12:00:00.000Z");
  let progress = recordPhraseReview(emptyProgress(), "greeting-hello", true, reviewedYesterday);
  progress = recordPhraseReview(progress, "greeting-morning", true, reviewedYesterday);

  const sessionQueue = createReviewQueue(progress, dueDate);
  assert.deepEqual(sessionQueue, ["greeting-hello", "greeting-morning"]);

  const afterFirstAnswer = recordPhraseReview(progress, sessionQueue[0]!, true, dueDate);
  assert.deepEqual(getDuePhraseIds(afterFirstAnswer, dueDate), ["greeting-morning"]);
  assert.deepEqual(sessionQueue, ["greeting-hello", "greeting-morning"]);
});

test("a difficult phrase is rescheduled for ten minutes and removed from learned set", () => {
  const start = new Date("2026-11-07T12:00:00.000Z");
  const known = recordPhraseReview(emptyProgress(), "greeting-hello", true, start);
  const again = recordPhraseReview(known, "greeting-hello", false, start);
  assert.equal(again.reviewSchedule["greeting-hello"].repetitions, 0);
  assert.equal(again.reviewSchedule["greeting-hello"].intervalDays, 0);
  assert.equal(again.reviewSchedule["greeting-hello"].dueAt, "2026-11-07T12:10:00.000Z");
  assert.deepEqual(again.completedPhraseIds, []);
  assert.equal(again.reviewSchedule["greeting-hello"].lapses, 1);
  assert.deepEqual(getDuePhraseIds(again, new Date("2026-11-07T12:09:59.000Z")), []);
  assert.deepEqual(getDuePhraseIds(again, new Date("2026-11-07T12:10:00.000Z")), ["greeting-hello"]);
});

test("unknown phrase identifiers do not alter learning progress", () => {
  const progress = emptyProgress();
  assert.equal(recordPhraseReview(progress, "invented-id", true), progress);
});

test("progress can be saved and loaded with review history", () => {
  installStorage();
  const progress = recordPhraseReview(
    emptyProgress(),
    "greeting-hello",
    true,
    new Date("2026-11-07T12:00:00.000Z"),
  );
  assert.equal(saveLocalLearningProgress(progress), true);
  assert.deepEqual(loadLocalLearningProgress(), progress);
});


test("every starter phrase has complete, non-empty content in all supported languages", () => {
  assert.equal(STARTER_PHRASES.length, 30);
  for (const phrase of STARTER_PHRASES) {
    assert.ok(phrase.id.trim().length > 0);
    for (const language of LANGUAGES) {
      assert.ok(getPhraseText(phrase, language.code).trim().length > 0, `${phrase.id} translation missing for ${language.code}`);
      assert.ok(getPhraseExplanation(phrase, language.code).trim().length > 0, `${phrase.id} explanation missing for ${language.code}`);
    }
  }
});

test("starter phrase identifiers are unique", () => {
  const identifiers = STARTER_PHRASES.map((phrase) => phrase.id);
  assert.equal(new Set(identifiers).size, identifiers.length);
});


test("Finnish, Spanish, and English interface dictionaries expose the same keys", () => {
  const finnishKeys = Object.keys(translations.fi).sort();
  assert.deepEqual(Object.keys(translations.es).sort(), finnishKeys);
  assert.deepEqual(Object.keys(translations.en).sort(), finnishKeys);
});


test("active study time is accumulated per local day and persists", () => {
  installStorage();
  const date = new Date(2026, 10, 7, 12, 0, 0);
  const first = recordStudySeconds([], 75, date);
  const second = recordStudySeconds(first, 45, date);
  assert.equal(second[0]?.seconds, 120);
  assert.equal(saveStudyDays(second), true);
  assert.deepEqual(loadStudyDays(), second);
});

test("study activity rejects invalid durations and sanitizes stored values", () => {
  const date = new Date(2026, 10, 7, 12, 0, 0);
  const baseline = [{ date: "2026-11-07", seconds: 30 }];
  assert.equal(recordStudySeconds(baseline, -10, date), baseline);
  assert.equal(recordStudySeconds(baseline, Number.NaN, date), baseline);
  assert.deepEqual(parseStudyDays([
    { date: "2026-11-07", seconds: 10.9 },
    { date: "2026-11-07", seconds: 20 },
    { date: "not-a-date", seconds: 100 },
    { date: "2026-11-08", seconds: -1 },
  ]), [{ date: "2026-11-07", seconds: 30 }]);
});

test("study summary reports today and distinct active days in the rolling seven-day window", () => {
  const now = new Date(2026, 10, 7, 12, 0, 0);
  const summary = getStudySummary([
    { date: "2026-11-01", seconds: 60 },
    { date: "2026-11-03", seconds: 120 },
    { date: "2026-11-07", seconds: 180 },
    { date: "2026-10-31", seconds: 600 },
  ], now);
  assert.equal(summary.todaySeconds, 180);
  assert.equal(summary.weekDays, 3);
  assert.equal(summary.weekSeconds, 360);
});

test("every starter phrase belongs to exactly one selectable lesson theme", () => {
  const assignments = LESSON_THEMES.flatMap((theme) => getThemePhraseIds(theme.id));
  assert.equal(getUnassignedPhraseIds().length, 0);
  assert.equal(assignments.length, STARTER_PHRASES.length);
  assert.equal(new Set(assignments).size, STARTER_PHRASES.length);
  for (const theme of LESSON_THEMES) {
    assert.ok(getThemePhraseIds(theme.id).length > 0, `Theme ${theme.id} must contain phrases`);
  }
});

test("daily and weekly goal progress is accurate and capped at completion", () => {
  const progress = getLearningGoalProgress({
    todaySeconds: 8 * 60 + 45,
    dailyGoalMinutes: 10,
    weekDays: 3,
    weeklyGoalDays: 5,
  });
  assert.deepEqual(progress.daily, { current: 8, target: 10, percent: 80, completed: false });
  assert.deepEqual(progress.weekly, { current: 3, target: 5, percent: 60, completed: false });

  const completed = getLearningGoalProgress({
    todaySeconds: 12 * 60,
    dailyGoalMinutes: 10,
    weekDays: 7,
    weeklyGoalDays: 5,
  });
  assert.deepEqual(completed.daily, { current: 12, target: 10, percent: 100, completed: true });
  assert.deepEqual(completed.weekly, { current: 7, target: 5, percent: 100, completed: true });
});

test("learning goal progress safely handles invalid and negative values", () => {
  const progress = getLearningGoalProgress({
    todaySeconds: Number.NaN,
    dailyGoalMinutes: 0,
    weekDays: -2,
    weeklyGoalDays: Number.NaN,
  });
  assert.deepEqual(progress.daily, { current: 0, target: 1, percent: 0, completed: false });
  assert.deepEqual(progress.weekly, { current: 0, target: 1, percent: 0, completed: false });
});

test("learning levels advance only from distinct phrases currently marked learned", () => {
  assert.equal(getLearningLevel(0).current.id, "beginner");
  assert.equal(getLearningLevel(6).next?.threshold, 7);
  assert.equal(getLearningLevel(7).current.id, "starter");
  assert.equal(getLearningLevel(14).current.id, "developing");
  assert.equal(getLearningLevel(22).current.id, "confident");
  assert.equal(getLearningLevel(30).current.id, "independent");
  assert.equal(getLearningLevel(30).progressToNext, 100);
});

test("learning level calculation safely bounds invalid and excessive counts", () => {
  assert.equal(getLearningLevel(-5).learned, 0);
  assert.equal(getLearningLevel(Number.NaN).learned, 0);
  assert.equal(getLearningLevel(999).learned, 30);
  assert.equal(getLearningLevel(2.9).learned, 2);
});

import {
  getLanguageCapability,
  isLanguageFeatureAvailable,
  isSpeechInterpretationPairAvailable,
} from "../src/services/language-capabilities";

test("language capability registry exposes only implemented interface and curated content", () => {
  for (const language of LANGUAGES) {
    assert.equal(isLanguageFeatureAvailable(language.code, "interface"), true);
    assert.equal(isLanguageFeatureAvailable(language.code, "curatedLearningContent"), true);
    assert.equal(isLanguageFeatureAvailable(language.code, "textTranslation"), false);
    assert.equal(isLanguageFeatureAvailable(language.code, "speechRecognition"), false);
    assert.equal(isLanguageFeatureAvailable(language.code, "speechSynthesis"), false);
    assert.equal(isLanguageFeatureAvailable(language.code, "ocr"), false);
  }
  assert.equal(getLanguageCapability("not-supported"), undefined);
  assert.equal(isLanguageFeatureAvailable("not-supported", "interface"), false);
});

test("speech interpretation is not advertised without real ASR, translation, and TTS", () => {
  assert.equal(isSpeechInterpretationPairAvailable("es", "fi"), false);
  assert.equal(isSpeechInterpretationPairAvailable("fi", "en"), false);
  assert.equal(isSpeechInterpretationPairAvailable("es", "es"), false);
});


test("home screen clearly labels unfinished AI, speech, and OCR features", () => {
  for (const language of ["fi", "es", "en"] as const) {
    const copy = translations[language];
    const featureStatus = [
      copy.learnDescription,
      copy.liveSubtitle,
      copy.liveDescription,
      copy.understandSubtitle,
      copy.understandDescription,
    ].join(" ");
    const statusWords = language === "fi"
      ? /kehityksessä|eivät ole vielä käytettävissä/
      : language === "es"
        ? /en desarrollo|todavía no están disponibles/
        : /in development|not available yet/;
    assert.match(featureStatus, statusWords);
  }
});
