import type {
  LanguageCode,
  LearnerLevel,
  ReviewQueueItem,
  UserProgressState,
} from "@/types/elovio";

const STORAGE_PREFIX = "elovio.v2.progress";
export const DAILY_LIVE_QUOTA_SECONDS = 15 * 60; // 15 min / day

const AUDIO_DB_NAME = "elovio.v2.offline-audio";
const AUDIO_DB_VERSION = 1;
const AUDIO_STORE_NAME = "tracks";

export interface StoredOfflineAudioRecord {
  key: string;
  lang: LanguageCode;
  text: string;
  contentType: string;
  data: ArrayBuffer;
  sizeBytes: number;
  updatedAt: number;
}

const REVIEW_INTERVAL_DAYS = [1, 3, 7] as const;

const DEFAULT_PROGRESS: UserProgressState = {
  preferences: {
    nativeLanguage: "fi",
    targetLanguage: "es",
    dailyGoalMinutes: 10,
  },
  learnedSentenceIds: [],
  completedLessonIds: [],
  studySecondsByDate: {},
  liveSecondsByDate: {},
  reviewQueue: [],
};

export function getDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStorageKey(accountId?: string | null): string {
  return accountId ? `${STORAGE_PREFIX}.${accountId}` : STORAGE_PREFIX;
}

export function loadProgress(accountId?: string | null): UserProgressState {
  if (typeof window === "undefined") return structuredClone(DEFAULT_PROGRESS);
  try {
    const raw = window.localStorage.getItem(getStorageKey(accountId));
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const parsed = JSON.parse(raw) as Partial<UserProgressState>;
    return {
      preferences: {
        nativeLanguage: parsed.preferences?.nativeLanguage ?? "fi",
        targetLanguage: parsed.preferences?.targetLanguage ?? "es",
        dailyGoalMinutes: parsed.preferences?.dailyGoalMinutes ?? 10,
      },
      learnedSentenceIds: Array.isArray(parsed.learnedSentenceIds)
        ? parsed.learnedSentenceIds
        : [],
      completedLessonIds: Array.isArray(parsed.completedLessonIds)
        ? parsed.completedLessonIds
        : [],
      studySecondsByDate: parsed.studySecondsByDate ?? {},
      liveSecondsByDate: parsed.liveSecondsByDate ?? {},
      reviewQueue: Array.isArray(parsed.reviewQueue) ? parsed.reviewQueue : [],
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(
  state: UserProgressState,
  accountId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getStorageKey(accountId),
      JSON.stringify(state),
    );
  } catch {
    // Ignore quota failures
  }
}

export function resetProgress(accountId?: string | null): UserProgressState {
  const fresh = structuredClone(DEFAULT_PROGRESS);
  saveProgress(fresh, accountId);
  return fresh;
}

export function getTodayStudiedMinutes(state: UserProgressState): number {
  const secs = state.studySecondsByDate[getDateKey()] ?? 0;
  return Math.round(secs / 60);
}

export function getRemainingLiveSeconds(state: UserProgressState): number {
  const used = state.liveSecondsByDate[getDateKey()] ?? 0;
  return Math.max(0, DAILY_LIVE_QUOTA_SECONDS - used);
}

export function addLiveSeconds(
  state: UserProgressState,
  seconds: number,
): UserProgressState {
  const key = getDateKey();
  const prev = state.liveSecondsByDate[key] ?? 0;
  return {
    ...state,
    liveSecondsByDate: {
      ...state.liveSecondsByDate,
      [key]: prev + Math.max(0, Math.round(seconds)),
    },
  };
}

export function addStudySeconds(
  state: UserProgressState,
  seconds: number,
): UserProgressState {
  const clean = Math.max(0, Math.round(seconds));
  if (clean === 0) return state;
  const key = getDateKey();
  const prev = state.studySecondsByDate[key] ?? 0;
  return {
    ...state,
    studySecondsByDate: {
      ...state.studySecondsByDate,
      [key]: prev + clean,
    },
  };
}

export function markSentenceLearned(
  state: UserProgressState,
  sentenceId: string,
): UserProgressState {
  if (state.learnedSentenceIds.includes(sentenceId)) {
    return state;
  }
  const nextQueue = state.reviewQueue.filter(
    (item) => item.sentenceId !== sentenceId,
  );
  return {
    ...state,
    learnedSentenceIds: [...state.learnedSentenceIds, sentenceId],
    reviewQueue: nextQueue,
  };
}

export function enqueueSentenceReview(
  state: UserProgressState,
  params: { sentenceId: string; lessonId: string },
): UserProgressState {
  const existing = state.reviewQueue.find(
    (item) => item.sentenceId === params.sentenceId,
  );
  const nextDate = new Date();
  // Due right away so user can review it on next bus ride or exercise
  nextDate.setMinutes(nextDate.getMinutes() - 1);

  const updatedItem: ReviewQueueItem = {
    sentenceId: params.sentenceId,
    lessonId: params.lessonId,
    intervalIndex: 0,
    wrongCount: (existing?.wrongCount ?? 0) + 1,
    dueAt: nextDate.toISOString(),
  };

  const remaining = state.reviewQueue.filter(
    (item) => item.sentenceId !== params.sentenceId,
  );
  return {
    ...state,
    reviewQueue: [...remaining, updatedItem],
  };
}

export function getWeeklyActivity(state: UserProgressState): Array<{
  dateKey: string;
  label: string;
  minutes: number;
  active: boolean;
}> {
  const dayNames = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
  const result: Array<{
    dateKey: string;
    label: string;
    minutes: number;
    active: boolean;
  }> = [];

  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key = getDateKey(d);
    const secs = state.studySecondsByDate[key] ?? 0;
    const minutes = Math.round(secs / 60);
    result.push({
      dateKey: key,
      label: dayNames[d.getDay()] ?? "",
      minutes,
      active: secs >= 30,
    });
  }
  return result;
}

export function getDueReviewItems(
  state: UserProgressState,
  now = new Date(),
): ReviewQueueItem[] {
  const nowIso = now.toISOString();
  return state.reviewQueue.filter((item) => item.dueAt <= nowIso);
}

export function getComputedLevel(state: UserProgressState): LearnerLevel {
  const count = state.learnedSentenceIds.length;
  if (count >= 180) return "Sujuva";
  if (count >= 80) return "Keskitaso";
  if (count >= 25) return "Perustaso";
  return "Aloittaja";
}

export function recordLessonResults(
  state: UserProgressState,
  params: {
    lessonId: string;
    correctSentenceIds: string[];
    wrongItems: Array<{ sentenceId: string; lessonId: string }>;
    durationSeconds: number;
    completedLesson: boolean;
  },
): UserProgressState {
  const todayKey = getDateKey();
  const learnedSet = new Set(state.learnedSentenceIds);
  for (const id of params.correctSentenceIds) {
    learnedSet.add(id);
  }

  const completedSet = new Set(state.completedLessonIds);
  if (params.completedLesson) {
    completedSet.add(params.lessonId);
  }

  const nextQueueMap = new Map<string, ReviewQueueItem>(
    state.reviewQueue.map((item) => [item.sentenceId, item]),
  );

  // Advance or clear correctly reviewed items
  for (const correctId of params.correctSentenceIds) {
    const existing = nextQueueMap.get(correctId);
    if (!existing) continue;
    if (existing.intervalIndex >= 2) {
      nextQueueMap.delete(correctId);
    } else {
      const nextIndex = (existing.intervalIndex + 1) as 1 | 2;
      const days = REVIEW_INTERVAL_DAYS[nextIndex];
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      nextQueueMap.set(correctId, {
        ...existing,
        intervalIndex: nextIndex,
        dueAt: nextDate.toISOString(),
      });
    }
  }

  // Enqueue wrong answers at interval 0 (+1 day)
  for (const wrong of params.wrongItems) {
    const existing = nextQueueMap.get(wrong.sentenceId);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + REVIEW_INTERVAL_DAYS[0]);
    nextQueueMap.set(wrong.sentenceId, {
      sentenceId: wrong.sentenceId,
      lessonId: wrong.lessonId,
      intervalIndex: 0,
      wrongCount: (existing?.wrongCount ?? 0) + 1,
      dueAt: nextDate.toISOString(),
    });
  }

  return {
    ...state,
    learnedSentenceIds: Array.from(learnedSet),
    completedLessonIds: Array.from(completedSet),
    studySecondsByDate: {
      ...state.studySecondsByDate,
      [todayKey]:
        (state.studySecondsByDate[todayKey] ?? 0) +
        Math.max(30, Math.round(params.durationSeconds)),
    },
    reviewQueue: Array.from(nextQueueMap.values()),
  };
}

// --- IndexedDB Offline Audio Storage ---

let audioDbPromise: Promise<IDBDatabase | null> | null = null;

export function makeAudioStorageKey(lang: LanguageCode, text: string): string {
  return `${lang}:${text.trim()}`;
}

function openAudioDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  if (audioDbPromise) return audioDbPromise;

  audioDbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(AUDIO_DB_NAME, AUDIO_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
          const store = db.createObjectStore(AUDIO_STORE_NAME, {
            keyPath: "key",
          });
          store.createIndex("lang", "lang", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        audioDbPromise = null;
        resolve(null);
      };
      request.onblocked = () => resolve(null);
    } catch {
      audioDbPromise = null;
      resolve(null);
    }
  });

  return audioDbPromise;
}

export async function saveOfflineAudioTrack(params: {
  lang: LanguageCode;
  text: string;
  contentType: string;
  data: ArrayBuffer;
}): Promise<boolean> {
  const db = await openAudioDatabase();
  if (!db || !params.text.trim() || params.data.byteLength === 0) {
    return false;
  }

  const record: StoredOfflineAudioRecord = {
    key: makeAudioStorageKey(params.lang, params.text),
    lang: params.lang,
    text: params.text.trim(),
    contentType: params.contentType || "audio/mpeg",
    data: params.data,
    sizeBytes: params.data.byteLength,
    updatedAt: Date.now(),
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
      const store = tx.objectStore(AUDIO_STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getOfflineAudioTrack(
  lang: LanguageCode,
  text: string,
): Promise<StoredOfflineAudioRecord | null> {
  const db = await openAudioDatabase();
  if (!db || !text.trim()) return null;

  const key = makeAudioStorageKey(lang, text);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
      const store = tx.objectStore(AUDIO_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result as StoredOfflineAudioRecord | undefined;
        resolve(result && result.data ? result : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function hasOfflineAudioKeys(
  expectedKeys: string[],
): Promise<Set<string>> {
  const matched = new Set<string>();
  const db = await openAudioDatabase();
  if (!db || expectedKeys.length === 0) return matched;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
      const store = tx.objectStore(AUDIO_STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const storedKeys = new Set(
          (req.result as Array<IDBValidKey>).map((k) => String(k)),
        );
        for (const k of expectedKeys) {
          if (storedKeys.has(k)) matched.add(k);
        }
        resolve(matched);
      };
      req.onerror = () => resolve(matched);
    } catch {
      resolve(matched);
    }
  });
}

export async function getOfflineAudioStats(): Promise<{
  count: number;
  totalBytes: number;
}> {
  const db = await openAudioDatabase();
  if (!db) return { count: 0, totalBytes: 0 };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
      const store = tx.objectStore(AUDIO_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as StoredOfflineAudioRecord[]) ?? [];
        const totalBytes = items.reduce(
          (sum, item) => sum + (item.sizeBytes || item.data?.byteLength || 0),
          0,
        );
        resolve({ count: items.length, totalBytes });
      };
      req.onerror = () => resolve({ count: 0, totalBytes: 0 });
    } catch {
      resolve({ count: 0, totalBytes: 0 });
    }
  });
}

export async function clearOfflineAudioTracks(): Promise<void> {
  const db = await openAudioDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
      tx.objectStore(AUDIO_STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
