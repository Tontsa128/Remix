import type { LanguageCode, LessonSentence, ListeningStyle } from "@/types/elovio";

const TTS_ENDPOINT = "https://translate.google.com/translate_tts";
const MAX_CHUNK_CHARS = 180;
const MAX_CACHE_ITEMS = 450;

interface CachedAudio {
  bytes: Uint8Array;
  contentType: string;
  cachedAt: number;
}

const audioCache = new Map<string, CachedAudio>();

// Exact MPEG-2 Layer III 64kbps 24kHz mono frame = 192 bytes (~24 ms per frame)
const SILENT_MP3_FRAME = (() => {
  const frame = new Uint8Array(192);
  frame[0] = 0xff;
  frame[1] = 0xf3;
  frame[2] = 0x84;
  frame[3] = 0xc4;
  return frame;
})();

export function buildSilenceMp3(durationMs: number): Uint8Array {
  const frameCount = Math.max(1, Math.round(durationMs / 24));
  const out = new Uint8Array(frameCount * SILENT_MP3_FRAME.length);
  for (let i = 0; i < frameCount; i += 1) {
    out.set(SILENT_MP3_FRAME, i * SILENT_MP3_FRAME.length);
  }
  return out;
}

export function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

export function splitTextForTts(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK_CHARS) return [clean];

  const chunks: string[] = [];
  let remaining = clean;

  while (remaining.length > MAX_CHUNK_CHARS) {
    const slice = remaining.slice(0, MAX_CHUNK_CHARS);
    const punctBreak = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf(", "),
    );
    const spaceBreak = slice.lastIndexOf(" ");
    const splitAt =
      punctBreak >= 40
        ? punctBreak + 1
        : spaceBreak >= 30
          ? spaceBreak
          : MAX_CHUNK_CHARS;

    const part = remaining.slice(0, splitAt).trim();
    if (part) chunks.push(part);
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function fetchPublicMp3Chunk(
  chunk: string,
  lang: LanguageCode,
): Promise<Uint8Array | null> {
  const url = `${TTS_ENDPOINT}?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(chunk)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
      Referer: "https://translate.google.com/",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength < 128) return null;
  return buf;
}

function setCacheEntry(key: string, value: CachedAudio): void {
  if (audioCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(key, value);
}

export async function synthesizePhraseAudio(params: {
  text: string;
  lang: LanguageCode;
}): Promise<{ bytes: Uint8Array; contentType: string; cached: boolean } | null> {
  const clean = params.text.replace(/\s+/g, " ").trim();
  if (!clean) return null;

  const cacheKey = `${params.lang}:${clean}`;
  const hit = audioCache.get(cacheKey);
  if (hit) {
    return { bytes: hit.bytes, contentType: hit.contentType, cached: true };
  }

  const parts = splitTextForTts(clean);
  if (parts.length === 0) return null;

  const buffers: Uint8Array[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const partBytes = await fetchPublicMp3Chunk(parts[i]!, params.lang);
    if (!partBytes) return null;
    buffers.push(partBytes);
    if (i < parts.length - 1) {
      buffers.push(buildSilenceMp3(160));
    }
  }

  const merged = buffers.length === 1 ? buffers[0]! : concatUint8Arrays(buffers);
  setCacheEntry(cacheKey, {
    bytes: merged,
    contentType: "audio/mpeg",
    cachedAt: Date.now(),
  });

  return { bytes: merged, contentType: "audio/mpeg", cached: false };
}

export async function synthesizeLessonPackMp3(params: {
  sentences: LessonSentence[];
  nativeLang: LanguageCode;
  targetLang: LanguageCode;
  style: ListeningStyle;
  pauseMs?: number;
}): Promise<Uint8Array | null> {
  const pauseMs = Math.max(400, Math.min(4000, params.pauseMs ?? 1200));
  const segments: Uint8Array[] = [];
  const gapShort = buildSilenceMp3(550);
  const gapThink = buildSilenceMp3(pauseMs);
  const gapBetweenItems = buildSilenceMp3(850);

  // Limit single downloadable MP3 pack to 30 items to keep response latency fast
  const capped = params.sentences.slice(0, 30);

  for (const item of capped) {
    if (params.style === "active_recall") {
      const nativeAudio = await synthesizePhraseAudio({
        text: item[params.nativeLang],
        lang: params.nativeLang,
      });
      const targetAudio = await synthesizePhraseAudio({
        text: item[params.targetLang],
        lang: params.targetLang,
      });
      if (nativeAudio) segments.push(nativeAudio.bytes, gapThink);
      if (targetAudio) {
        segments.push(targetAudio.bytes, gapShort, targetAudio.bytes);
      }
    } else if (params.style === "comprehension") {
      const targetAudio = await synthesizePhraseAudio({
        text: item[params.targetLang],
        lang: params.targetLang,
      });
      const nativeAudio = await synthesizePhraseAudio({
        text: item[params.nativeLang],
        lang: params.nativeLang,
      });
      if (targetAudio) segments.push(targetAudio.bytes, gapThink);
      if (nativeAudio) segments.push(nativeAudio.bytes);
    } else {
      const targetAudio = await synthesizePhraseAudio({
        text: item[params.targetLang],
        lang: params.targetLang,
      });
      if (targetAudio) {
        segments.push(targetAudio.bytes, gapShort, targetAudio.bytes);
      }
    }
    segments.push(gapBetweenItems);
  }

  if (segments.length === 0) return null;
  return concatUint8Arrays(segments);
}
