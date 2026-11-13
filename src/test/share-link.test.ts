import { describe, expect, it, vi } from "vitest";
import {
  buildShareLearningUrl,
  copyTextToClipboard,
  getSnapshotLevel,
  mergeSharedSnapshot,
  parseSharePayloadFromSearch,
} from "@/services/share-link";
import type { UserProgressState } from "@/types/elovio";

function createSampleProgress(): UserProgressState {
  return {
    preferences: {
      nativeLanguage: "fi",
      targetLanguage: "es",
      dailyGoalMinutes: 15,
    },
    learnedSentenceIds: ["greet-1", "vverb-1", "vnat-1"],
    completedLessonIds: ["greetings"],
    studySecondsByDate: { "2026-11-13": 420 },
    liveSecondsByDate: {},
    reviewQueue: [
      {
        sentenceId: "cafe-2",
        lessonId: "cafe",
        dueAt: "2026-11-13T10:00:00.000Z",
        intervalIndex: 0,
        wrongCount: 1,
      },
    ],
  };
}

describe("Learning path & progress URL sharing", () => {
  it("generates unique URLs encoding user learning path, active deck, and progress", () => {
    const progress = createSampleProgress();
    const urlA = buildShareLearningUrl({
      progress,
      activeTab: "listen",
      activeDeckId: "all-course",
      audioOnlySchool: true,
      origin: "https://elovio.example",
    });
    const urlB = buildShareLearningUrl({
      progress: {
        ...progress,
        learnedSentenceIds: [...progress.learnedSentenceIds, "vcol-1"],
      },
      activeTab: "listen",
      activeDeckId: "all-course",
      audioOnlySchool: true,
      origin: "https://elovio.example",
    });

    expect(urlA.startsWith("https://elovio.example/?path=")).toBe(true);
    expect(urlA).not.toBe(urlB);

    const parsed = parseSharePayloadFromSearch(urlA);
    expect(parsed).not.toBeNull();
    expect(parsed?.n).toBe("fi");
    expect(parsed?.t).toBe("es");
    expect(parsed?.g).toBe(15);
    expect(parsed?.l).toEqual(["greet-1", "vverb-1", "vnat-1"]);
    expect(parsed?.c).toEqual(["greetings"]);
    expect(parsed?.r).toEqual(["cafe-2"]);
    expect(parsed?.tab).toBe("listen");
    expect(parsed?.deck).toBe("all-course");
    expect(parsed?.audioOnly).toBe(true);
    expect(getSnapshotLevel(parsed!)).toBe("Aloittaja");
  });

  it("rejects malformed or invalid ?path= payloads cleanly", () => {
    expect(parseSharePayloadFromSearch("")).toBeNull();
    expect(parseSharePayloadFromSearch("?path=not-valid-base64!!!")).toBeNull();
  });

  it("merges shared learning snapshot into another user's progress without duplicates", () => {
    const shared = parseSharePayloadFromSearch(
      buildShareLearningUrl({
        progress: createSampleProgress(),
        origin: "https://elovio.example",
      }),
    )!;

    const targetUser: UserProgressState = {
      preferences: {
        nativeLanguage: "fi",
        targetLanguage: "en",
        dailyGoalMinutes: 10,
      },
      learnedSentenceIds: ["greet-1", "shop-1"],
      completedLessonIds: ["groceries"],
      studySecondsByDate: {},
      liveSecondsByDate: {},
      reviewQueue: [],
    };

    const merged = mergeSharedSnapshot(targetUser, shared);
    expect(merged.preferences.targetLanguage).toBe("es");
    expect(merged.preferences.dailyGoalMinutes).toBe(15);
    expect(merged.learnedSentenceIds).toEqual([
      "greet-1",
      "shop-1",
      "vverb-1",
      "vnat-1",
    ]);
    expect(merged.completedLessonIds).toEqual(["groceries", "greetings"]);
    expect(merged.reviewQueue.some((i) => i.sentenceId === "cafe-2")).toBe(
      true,
    );
  });

  it("converts private ais-dev preview origin to ais-pre shared URL automatically", () => {
    const url = buildShareLearningUrl({
      progress: createSampleProgress(),
      origin:
        "https://ais-dev-6b4xd46cvdfj2xczqb3omo-651338522389.europe-west3.run.app",
    });
    expect(
      url.startsWith(
        "https://ais-pre-6b4xd46cvdfj2xczqb3omo-651338522389.europe-west3.run.app/?path=",
      ),
    ).toBe(true);
  });

  it("copies generated URL to navigator.clipboard cleanly", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    try {
      const ok = await copyTextToClipboard("https://elovio.example/?path=abc");
      expect(ok).toBe(true);
      expect(writeText).toHaveBeenCalledWith("https://elovio.example/?path=abc");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
