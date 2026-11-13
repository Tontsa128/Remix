import { describe, expect, it } from "vitest";
import {
  ALL_SENTENCES,
  LESSONS,
  SENTENCE_LESSONS,
  VOCAB_PACKS,
} from "@/data/lessons";
import { mapMicError } from "@/services/mic";
import { isFuzzyAnswerMatch } from "@/services/speech";
import {
  addLiveSeconds,
  addStudySeconds,
  DAILY_LIVE_QUOTA_SECONDS,
  enqueueSentenceReview,
  getComputedLevel,
  getDueReviewItems,
  getRemainingLiveSeconds,
  getTodayStudiedMinutes,
  loadProgress,
  markSentenceLearned,
  recordLessonResults,
} from "@/services/storage";

describe("Elovio curriculum, audio learning, and domain logic", () => {
  it("provides 30 packs with 440 unique trilingual words and sentences", () => {
    expect(VOCAB_PACKS).toHaveLength(14);
    expect(SENTENCE_LESSONS).toHaveLength(16);
    expect(LESSONS).toHaveLength(30);
    expect(ALL_SENTENCES.length).toBe(440);

    const seenIds = new Set<string>();
    for (const lesson of LESSONS) {
      expect(lesson.sentences.length).toBeGreaterThanOrEqual(10);
      for (const s of lesson.sentences) {
        expect(seenIds.has(s.id)).toBe(false);
        seenIds.add(s.id);
        expect(s.fi.trim().length).toBeGreaterThan(0);
        expect(s.es.trim().length).toBeGreaterThan(0);
        expect(s.en.trim().length).toBeGreaterThan(0);
        expect(s.pronunciationHint.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("matches typed answers fuzzily across small typos and missing accents", () => {
    expect(isFuzzyAnswerMatch("Hola como estas", "Hola, ¿cómo estás?")).toBe(
      true,
    );
    expect(isFuzzyAnswerMatch("Un cafe con lche", "Un café con leche")).toBe(
      true,
    );
    expect(isFuzzyAnswerMatch("Buenos noches", "Mucho gusto")).toBe(false);
  });

  it("maps microphone errors to clear Finnish instructions", () => {
    const denied = mapMicError({ name: "NotAllowedError" });
    expect(denied.errorKind).toBe("NotAllowedError");
    expect(denied.errorMessage).toContain("Salli mikrofoni");

    const missing = mapMicError({ name: "NotFoundError" });
    expect(missing.errorKind).toBe("NotFoundError");

    const busy = mapMicError({ name: "NotReadableError" });
    expect(busy.errorKind).toBe("NotReadableError");
  });

  it("tracks spaced repetition, audio study minutes, and learned vocabulary", () => {
    let state = loadProgress("test-user");
    expect(getComputedLevel(state)).toBe("Aloittaja");
    expect(getRemainingLiveSeconds(state)).toBe(DAILY_LIVE_QUOTA_SECONDS);

    state = recordLessonResults(state, {
      lessonId: "greetings",
      correctSentenceIds: ["greet-1", "greet-2", "greet-3"],
      wrongItems: [{ sentenceId: "greet-4", lessonId: "greetings" }],
      durationSeconds: 120,
      completedLesson: true,
    });

    expect(state.learnedSentenceIds).toHaveLength(3);
    expect(state.reviewQueue).toHaveLength(1);
    expect(state.reviewQueue[0]?.sentenceId).toBe("greet-4");
    expect(getTodayStudiedMinutes(state)).toBe(2);

    const tomorrowPlus = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(getDueReviewItems(state, tomorrowPlus)).toHaveLength(1);

    // Bus audio listening time & immediate review marking
    state = addStudySeconds(state, 180);
    expect(getTodayStudiedMinutes(state)).toBe(5);

    state = enqueueSentenceReview(state, {
      sentenceId: "vverb-1",
      lessonId: "vocab-verbs",
    });
    expect(getDueReviewItems(state).some((i) => i.sentenceId === "vverb-1")).toBe(
      true,
    );

    state = markSentenceLearned(state, "vverb-1");
    expect(state.learnedSentenceIds.includes("vverb-1")).toBe(true);
    expect(state.reviewQueue.some((i) => i.sentenceId === "vverb-1")).toBe(
      false,
    );

    state = addLiveSeconds(state, 300);
    expect(getRemainingLiveSeconds(state)).toBe(DAILY_LIVE_QUOTA_SECONDS - 300);
  });
});
