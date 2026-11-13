import { ALL_SENTENCES, findLessonIdForSentenceId } from "@/data/lessons";
import { enqueueSentenceReview, getComputedLevel } from "@/services/storage";
import type {
  LanguageCode,
  LearnerLevel,
  TabId,
  UserProgressState,
} from "@/types/elovio";

export interface SharedLearningSnapshot {
  v: 1;
  id: string;
  n: LanguageCode;
  t: LanguageCode;
  g: number;
  l: string[];
  c: string[];
  r: string[];
  s: number;
  tab: TabId;
  deck?: string;
  audioOnly?: boolean;
}

export interface ShareLearningPathParams {
  progress: UserProgressState;
  activeTab?: TabId;
  activeDeckId?: string;
  audioOnlySchool?: boolean;
  origin?: string;
}

const VALID_LANGS = new Set<LanguageCode>(["fi", "es", "en"]);
const VALID_TABS = new Set<TabId>([
  "home",
  "listen",
  "exercises",
  "interpreter",
  "tutor",
]);

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(token: string): Uint8Array {
  const padded = token
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(token.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function createSnapshotId(): string {
  const timePart = Date.now().toString(36);
  const randPart = Math.floor(Math.random() * 1679616)
    .toString(36)
    .padStart(4, "0");
  return `${timePart}-${randPart}`;
}

export function buildSharedSnapshot(
  params: ShareLearningPathParams,
): SharedLearningSnapshot {
  const totalStudySecs = Object.values(
    params.progress.studySecondsByDate,
  ).reduce((sum, secs) => sum + secs, 0);

  const snapshot: SharedLearningSnapshot = {
    v: 1,
    id: createSnapshotId(),
    n: params.progress.preferences.nativeLanguage,
    t: params.progress.preferences.targetLanguage,
    g: params.progress.preferences.dailyGoalMinutes,
    l: Array.from(new Set(params.progress.learnedSentenceIds)),
    c: Array.from(new Set(params.progress.completedLessonIds)),
    r: Array.from(
      new Set(params.progress.reviewQueue.map((item) => item.sentenceId)),
    ),
    s: Math.round(totalStudySecs / 60),
    tab: params.activeTab ?? "home",
  };

  if (params.activeDeckId) {
    snapshot.deck = params.activeDeckId;
  }
  if (params.audioOnlySchool) {
    snapshot.audioOnly = true;
  }

  return snapshot;
}

export function encodeSharedSnapshot(snapshot: SharedLearningSnapshot): string {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function isDevPreviewOrigin(origin?: string): boolean {
  const target =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return target.startsWith("https://ais-dev-");
}

export function resolvePublicShareOrigin(origin?: string): string {
  const target =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  if (!target) return "";
  if (target.startsWith("https://ais-dev-")) {
    return target.replace("https://ais-dev-", "https://ais-pre-");
  }
  return target;
}

export function buildShareLearningUrl(params: ShareLearningPathParams): string {
  const snapshot = buildSharedSnapshot(params);
  const encoded = encodeSharedSnapshot(snapshot);
  const baseOrigin = resolvePublicShareOrigin(params.origin);
  return baseOrigin ? `${baseOrigin}/?path=${encoded}` : `/?path=${encoded}`;
}

export function decodeSharedSnapshot(
  encodedToken: string,
): SharedLearningSnapshot | null {
  try {
    const trimmed = encodedToken.trim();
    if (!trimmed) return null;
    const bytes = base64UrlToBytes(trimmed);
    const json = new TextDecoder().decode(bytes);
    const raw = JSON.parse(json) as Partial<SharedLearningSnapshot>;
    if (!raw || raw.v !== 1) return null;
    if (!raw.n || !VALID_LANGS.has(raw.n)) return null;
    if (!raw.t || !VALID_LANGS.has(raw.t)) return null;
    if (typeof raw.g !== "number" || !Number.isFinite(raw.g) || raw.g <= 0) {
      return null;
    }

    const validSentenceIds = new Set(ALL_SENTENCES.map((s) => s.id));
    const learned = Array.isArray(raw.l)
      ? raw.l.filter(
          (id): id is string =>
            typeof id === "string" && validSentenceIds.has(id),
        )
      : [];
    const completed = Array.isArray(raw.c)
      ? raw.c.filter((id): id is string => typeof id === "string")
      : [];
    const review = Array.isArray(raw.r)
      ? raw.r.filter(
          (id): id is string =>
            typeof id === "string" && validSentenceIds.has(id),
        )
      : [];

    const tab: TabId =
      raw.tab && VALID_TABS.has(raw.tab) ? raw.tab : "home";

    const parsed: SharedLearningSnapshot = {
      v: 1,
      id: typeof raw.id === "string" && raw.id ? raw.id : "shared",
      n: raw.n,
      t: raw.t,
      g: Math.min(120, Math.max(5, Math.round(raw.g))),
      l: Array.from(new Set(learned)),
      c: Array.from(new Set(completed)),
      r: Array.from(new Set(review)),
      s:
        typeof raw.s === "number" && Number.isFinite(raw.s) && raw.s >= 0
          ? Math.round(raw.s)
          : 0,
      tab,
    };

    if (typeof raw.deck === "string" && raw.deck.trim()) {
      parsed.deck = raw.deck.trim();
    }
    if (raw.audioOnly === true) {
      parsed.audioOnly = true;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function parseSharePayloadFromSearch(
  searchOrUrl: string,
): SharedLearningSnapshot | null {
  try {
    let query = searchOrUrl;
    if (searchOrUrl.includes("://")) {
      query = new URL(searchOrUrl).search;
    } else if (searchOrUrl.includes("?")) {
      query = searchOrUrl.slice(searchOrUrl.indexOf("?"));
    }
    const params = new URLSearchParams(query);
    const token = params.get("path");
    if (!token) return null;
    return decodeSharedSnapshot(token);
  } catch {
    return null;
  }
}

export function getSnapshotLevel(
  snapshot: SharedLearningSnapshot,
): LearnerLevel {
  return getComputedLevel({
    preferences: {
      nativeLanguage: snapshot.n,
      targetLanguage: snapshot.t,
      dailyGoalMinutes: snapshot.g,
    },
    learnedSentenceIds: snapshot.l,
    completedLessonIds: snapshot.c,
    studySecondsByDate: {},
    liveSecondsByDate: {},
    reviewQueue: [],
  });
}

export function mergeSharedSnapshot(
  current: UserProgressState,
  snapshot: SharedLearningSnapshot,
): UserProgressState {
  const learnedSet = new Set([
    ...current.learnedSentenceIds,
    ...snapshot.l,
  ]);
  const completedSet = new Set([
    ...current.completedLessonIds,
    ...snapshot.c,
  ]);

  let next: UserProgressState = {
    ...current,
    preferences: {
      nativeLanguage: snapshot.n,
      targetLanguage: snapshot.t,
      dailyGoalMinutes: snapshot.g,
    },
    learnedSentenceIds: Array.from(learnedSet),
    completedLessonIds: Array.from(completedSet),
  };

  for (const sentenceId of snapshot.r) {
    if (learnedSet.has(sentenceId)) continue;
    const alreadyQueued = next.reviewQueue.some(
      (item) => item.sentenceId === sentenceId,
    );
    if (!alreadyQueued) {
      next = enqueueSentenceReview(next, {
        sentenceId,
        lessonId: findLessonIdForSentenceId(sentenceId),
      });
    }
  }

  return next;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
