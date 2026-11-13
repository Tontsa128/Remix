import { LESSONS } from "@/data/lessons";
import {
  playUriUntilFinished,
  stopBackgroundAudioSession,
} from "@/services/expo-av-background";
import { speakAsync, waitPause } from "@/services/speech";
import {
  clearOfflineAudioTracks,
  getOfflineAudioStats,
  getOfflineAudioTrack,
  hasOfflineAudioKeys,
  makeAudioStorageKey,
  saveOfflineAudioTrack,
} from "@/services/storage";
import type { LanguageCode, Lesson, LessonSentence } from "@/types/elovio";

const AUDIO_CACHE_NAME = "elovio-audio-mp3-v1";
const MAX_BLOB_CACHE = 80;

export interface AudioCatalogTrack {
  id: string;
  kind: "word" | "sentence";
  fi: string;
  es: string;
  en: string;
  pronunciationHint: string;
  audioUrls: Record<LanguageCode, string>;
}

export interface AudioCatalogPack {
  id: string;
  title: string;
  subtitle: string;
  category: Lesson["category"];
  kind: "word" | "sentence";
  difficulty: Lesson["difficulty"];
  estimatedMinutes: number;
  trackCount: number;
  packDownloadUrl: string;
  tracks: AudioCatalogTrack[];
}

export interface AudioCatalogResponse {
  languages: LanguageCode[];
  formats: string[];
  totalPacks: number;
  totalTracks: number;
  packs: AudioCatalogPack[];
}

const memoryBlobCache = new Map<string, string>();
const inflightFetchMap = new Map<string, Promise<string | null>>();

export function buildTtsRequestUrl(lang: LanguageCode, text: string): string {
  return `/api/tts?lang=${lang}&text=${encodeURIComponent(text.trim())}`;
}

export function buildLocalCatalogFallback(
  nativeLang: LanguageCode,
  targetLang: LanguageCode,
): AudioCatalogResponse {
  const packs: AudioCatalogPack[] = LESSONS.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    subtitle: lesson.subtitle,
    category: lesson.category,
    kind: lesson.kind ?? "sentence",
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    trackCount: lesson.sentences.length,
    packDownloadUrl: `/api/audio-pack?packId=${encodeURIComponent(lesson.id)}&native=${nativeLang}&target=${targetLang}`,
    tracks: lesson.sentences.map((s) => ({
      id: s.id,
      kind: s.kind ?? lesson.kind ?? "sentence",
      fi: s.fi,
      es: s.es,
      en: s.en,
      pronunciationHint: s.pronunciationHint,
      audioUrls: {
        fi: buildTtsRequestUrl("fi", s.fi),
        es: buildTtsRequestUrl("es", s.es),
        en: buildTtsRequestUrl("en", s.en),
      },
    })),
  }));

  return {
    languages: ["es", "fi", "en"],
    formats: ["audio/mpeg"],
    totalPacks: packs.length,
    totalTracks: packs.reduce((sum, p) => sum + p.trackCount, 0),
    packs,
  };
}

export async function fetchAudioCatalog(params: {
  nativeLang: LanguageCode;
  targetLang: LanguageCode;
  signal?: AbortSignal;
}): Promise<{ catalog: AudioCatalogResponse; fromServer: boolean }> {
  try {
    const res = await fetch(
      `/api/audio-catalog?native=${params.nativeLang}&target=${params.targetLang}`,
      params.signal ? { signal: params.signal } : undefined,
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as AudioCatalogResponse;
    if (!data || !Array.isArray(data.packs) || data.packs.length === 0) {
      throw new Error("Empty catalog");
    }
    return { catalog: data, fromServer: true };
  } catch {
    return {
      catalog: buildLocalCatalogFallback(params.nativeLang, params.targetLang),
      fromServer: false,
    };
  }
}

function setMemoryBlob(key: string, blobUrl: string): void {
  if (memoryBlobCache.size >= MAX_BLOB_CACHE) {
    const oldestKey = memoryBlobCache.keys().next().value;
    if (oldestKey) {
      const oldUrl = memoryBlobCache.get(oldestKey);
      memoryBlobCache.delete(oldestKey);
      if (oldUrl) {
        try {
          URL.revokeObjectURL(oldUrl);
        } catch {
          // Ignore revoke failure
        }
      }
    }
  }
  memoryBlobCache.set(key, blobUrl);
}

export async function getOrFetchMp3BlobUrl(
  text: string,
  lang: LanguageCode,
): Promise<string | null> {
  if (typeof window === "undefined" || !text.trim()) return null;

  const key = makeAudioStorageKey(lang, text);
  const memHit = memoryBlobCache.get(key);
  if (memHit) return memHit;

  const inflight = inflightFetchMap.get(key);
  if (inflight) return inflight;

  const requestUrl = buildTtsRequestUrl(lang, text);

  const task = (async (): Promise<string | null> => {
    try {
      // 1. Check IndexedDB offline audio storage first
      const idbRecord = await getOfflineAudioTrack(lang, text);
      if (idbRecord && idbRecord.data.byteLength > 100) {
        const blob = new Blob([idbRecord.data], {
          type: idbRecord.contentType || "audio/mpeg",
        });
        const url = URL.createObjectURL(blob);
        setMemoryBlob(key, url);
        return url;
      }

      // 2. Check CacheStorage fallback and migrate into IndexedDB
      if ("caches" in window) {
        try {
          const cache = await window.caches.open(AUDIO_CACHE_NAME);
          const cachedResponse = await cache.match(requestUrl);
          if (cachedResponse) {
            const contentType =
              cachedResponse.headers.get("content-type") || "audio/mpeg";
            const arrayBuf = await cachedResponse.arrayBuffer();
            if (arrayBuf.byteLength > 100) {
              void saveOfflineAudioTrack({
                lang,
                text,
                contentType,
                data: arrayBuf,
              });
              const url = URL.createObjectURL(
                new Blob([arrayBuf], { type: contentType }),
              );
              setMemoryBlob(key, url);
              return url;
            }
          }
        } catch {
          // CacheStorage unavailable or blocked; continue to network fetch
        }
      }

      // 3. Fetch MP3 stream from server /api/tts and persist into IndexedDB
      const res = await fetch(requestUrl);
      if (!res.ok) return null;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("audio")) return null;

      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength < 100) return null;

      // Persist binary audio in IndexedDB so phrases remain playable completely offline
      await saveOfflineAudioTrack({
        lang,
        text,
        contentType,
        data: arrayBuf,
      });

      const blob = new Blob([arrayBuf], { type: contentType });
      if ("caches" in window) {
        void window.caches
          .open(AUDIO_CACHE_NAME)
          .then((cache) =>
            cache.put(
              requestUrl,
              new Response(blob, {
                status: 200,
                headers: { "Content-Type": contentType },
              }),
            ),
          )
          .catch(() => undefined);
      }

      const url = URL.createObjectURL(blob);
      setMemoryBlob(key, url);
      return url;
    } catch {
      return null;
    } finally {
      inflightFetchMap.delete(key);
    }
  })();

  inflightFetchMap.set(key, task);
  return task;
}

export function stopSharedMp3Playback(): void {
  stopBackgroundAudioSession();
}

export function playMp3BlobUrl(
  blobUrl: string,
  options?: {
    rate?: number | undefined;
    signal?: AbortSignal | undefined;
  },
): Promise<boolean> {
  return playUriUntilFinished({
    uri: blobUrl,
    ...(options?.rate !== undefined ? { rate: options.rate } : {}),
    ...(options?.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function speakPhraseWithStudioAudio(
  text: string,
  lang: LanguageCode,
  options?: {
    rate?: number;
    preferStudioMp3?: boolean;
    signal?: AbortSignal;
  },
): Promise<"mp3" | "device"> {
  if (options?.signal?.aborted || !text.trim()) return "mp3";

  const preferMp3 = options?.preferStudioMp3 !== false;
  if (preferMp3) {
    const blobUrl = await getOrFetchMp3BlobUrl(text, lang);
    if (options?.signal?.aborted) return "mp3";
    if (blobUrl) {
      const played = await playMp3BlobUrl(blobUrl, {
        rate: options?.rate,
        signal: options?.signal,
      });
      if (played) return "mp3";
    }
  }

  // Graceful fallback to local Web Speech voice when offline & not yet cached
  if (!options?.signal?.aborted) {
    const fallbackOpts: { rate?: number; signal?: AbortSignal } = {};
    if (options?.rate !== undefined) fallbackOpts.rate = options.rate;
    if (options?.signal !== undefined) fallbackOpts.signal = options.signal;
    await speakAsync(text, lang, fallbackOpts);
  }
  return "device";
}

export function preloadUpcomingTracks(
  items: LessonSentence[],
  currentIndex: number,
  languages: LanguageCode[],
): void {
  const candidates = [items[currentIndex + 1], items[currentIndex + 2]].filter(
    Boolean,
  ) as LessonSentence[];
  for (const item of candidates) {
    for (const lang of languages) {
      void getOrFetchMp3BlobUrl(item[lang], lang);
    }
  }
}

export async function getPackCachedTrackCount(
  items: LessonSentence[],
  languages: LanguageCode[],
): Promise<{ cached: number; total: number }> {
  const total = items.length * languages.length;
  if (typeof window === "undefined" || total === 0) {
    return { cached: 0, total };
  }

  const expectedKeys: string[] = [];
  for (const item of items) {
    for (const lang of languages) {
      expectedKeys.push(makeAudioStorageKey(lang, item[lang]));
    }
  }

  const matchedKeys = await hasOfflineAudioKeys(expectedKeys);
  return { cached: matchedKeys.size, total };
}

export async function getOfflineStorageSummary(): Promise<{
  count: number;
  totalBytes: number;
}> {
  return getOfflineAudioStats();
}

export async function clearAllOfflineAudio(): Promise<void> {
  await clearOfflineAudioTracks();
  for (const url of memoryBlobCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revoke failure
    }
  }
  memoryBlobCache.clear();
  if (typeof window !== "undefined" && "caches" in window) {
    await window.caches.delete(AUDIO_CACHE_NAME).catch(() => undefined);
  }
}

export async function precacheAudioPack(params: {
  items: LessonSentence[];
  languages: LanguageCode[];
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}): Promise<{ done: number; total: number; failed: number }> {
  const queue: Array<{ text: string; lang: LanguageCode }> = [];
  for (const item of params.items) {
    for (const lang of params.languages) {
      queue.push({ text: item[lang], lang });
    }
  }

  const total = queue.length;
  let done = 0;
  let failed = 0;
  params.onProgress?.(0, total);

  const concurrency = 3;
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length && !params.signal?.aborted) {
      const job = queue[cursor];
      cursor += 1;
      if (!job) break;
      const res = await getOrFetchMp3BlobUrl(job.text, job.lang);
      if (!res) failed += 1;
      done += 1;
      params.onProgress?.(done, total);
      await waitPause(20, params.signal);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  );

  return { done, total, failed };
}
