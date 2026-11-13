import {
  clearOfflineAudioTracks,
  getOfflineAudioStats,
  getOfflineAudioTrack,
  hasOfflineAudioKeys,
  makeAudioStorageKey,
  saveOfflineAudioTrack,
} from "@/services/storage";
import { describe, expect, it, vi } from "vitest";
import {
  buildSilenceMp3,
  concatUint8Arrays,
  splitTextForTts,
} from "@/lib/audio-tts.server";
import {
  buildLocalCatalogFallback,
  buildTtsRequestUrl,
} from "@/services/audio-library";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "@/services/expo-av-background";

describe("Audio library & MP3 TTS utilities", () => {
  it("generates exact MPEG-2 Layer III silent frames of requested duration", () => {
    const silence = buildSilenceMp3(240);
    // ~10 frames × 192 bytes = 1920 bytes
    expect(silence.byteLength).toBe(1920);
    expect(silence[0]).toBe(0xff);
    expect(silence[1]).toBe(0xf3);
    expect(silence[2]).toBe(0x84);
    expect(silence[3]).toBe(0xc4);
  });

  it("concatenates audio byte segments preserving exact total byte size", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5]);
    const merged = concatUint8Arrays([a, b]);
    expect(Array.from(merged)).toEqual([1, 2, 3, 4, 5]);
  });

  it("splits long phrases cleanly on punctuation/spaces within 180 chars", () => {
    const longText =
      "Anteeksi, missä on lähin juna-asema? Haluaisin ostaa yhden menolipun keskustaan ja kysyä mihin aikaan seuraava juna lähtee laiturilta kaksi. Paljonko se maksaa ja voinko maksaa kortilla?";
    const parts = splitTextForTts(longText);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(180);
    }
  });

  it("builds trilingual catalog with MP3 stream & download URLs for es, fi, en", () => {
    const catalog = buildLocalCatalogFallback("fi", "es");
    expect(catalog.languages).toEqual(["es", "fi", "en"]);
    expect(catalog.totalPacks).toBe(30);
    expect(catalog.totalTracks).toBe(440);

    const first = catalog.packs[0]!;
    expect(first.packDownloadUrl).toContain("/api/audio-pack?packId=");
    const track = first.tracks[0]!;
    expect(track.audioUrls.fi).toContain("/api/tts?lang=fi");
    expect(track.audioUrls.es).toContain("/api/tts?lang=es");
    expect(track.audioUrls.en).toContain("/api/tts?lang=en");
    expect(buildTtsRequestUrl("es", "Hola")).toBe("/api/tts?lang=es&text=Hola");
  });

  it("configures Expo AV background audio mode flags for screen-off playback", async () => {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const mode = Audio.getAudioMode();
    expect(mode.staysActiveInBackground).toBe(true);
    expect(mode.playsInSilentModeIOS).toBe(true);
    expect(mode.interruptionModeIOS).toBe(InterruptionModeIOS.DoNotMix);
    expect(mode.interruptionModeAndroid).toBe(InterruptionModeAndroid.DoNotMix);
  });

  it("normalizes IndexedDB audio keys and degrades gracefully when indexedDB is absent", async () => {
    expect(makeAudioStorageKey("es", "  Hola mundo  ")).toBe("es:Hola mundo");

    const sampleBytes = new Uint8Array([1, 2, 3, 4]).buffer;
    expect(
      await saveOfflineAudioTrack({
        lang: "es",
        text: "Hola",
        contentType: "audio/mpeg",
        data: sampleBytes,
      }),
    ).toBe(false);
    expect(await getOfflineAudioTrack("es", "Hola")).toBeNull();
    expect((await hasOfflineAudioKeys(["es:Hola"])).size).toBe(0);
    expect(await getOfflineAudioStats()).toEqual({ count: 0, totalBytes: 0 });
    await expect(clearOfflineAudioTracks()).resolves.toBeUndefined();
  });

  it("persists, reads, measures, and clears MP3 binary payloads when IndexedDB is available", async () => {
    const rows = new Map<string, unknown>();

    const mockStore = {
      createIndex: vi.fn(),
      put: (record: { key: string }) => {
        rows.set(record.key, record);
      },
      get: (key: string) => {
        const req: { result?: unknown; onsuccess?: () => void } = {};
        queueMicrotask(() => {
          req.result = rows.get(key);
          req.onsuccess?.();
        });
        return req;
      },
      getAllKeys: () => {
        const req: { result?: unknown[]; onsuccess?: () => void } = {};
        queueMicrotask(() => {
          req.result = Array.from(rows.keys());
          req.onsuccess?.();
        });
        return req;
      },
      getAll: () => {
        const req: { result?: unknown[]; onsuccess?: () => void } = {};
        queueMicrotask(() => {
          req.result = Array.from(rows.values());
          req.onsuccess?.();
        });
        return req;
      },
      clear: () => {
        rows.clear();
      },
    };

    const mockDb = {
      objectStoreNames: { contains: () => false },
      createObjectStore: () => mockStore,
      transaction: () => {
        const tx: {
          objectStore: () => typeof mockStore;
          oncomplete?: () => void;
        } = {
          objectStore: () => mockStore,
        };
        queueMicrotask(() => tx.oncomplete?.());
        return tx;
      },
    };

    const fakeIndexedDb = {
      open: () => {
        const req: {
          result: typeof mockDb;
          onupgradeneeded?: () => void;
          onsuccess?: () => void;
        } = { result: mockDb };
        queueMicrotask(() => {
          req.onupgradeneeded?.();
          req.onsuccess?.();
        });
        return req;
      },
    };

    vi.stubGlobal("indexedDB", fakeIndexedDb);
    try {
      const mp3Bytes = new Uint8Array(256).fill(0xff).buffer;
      const saved = await saveOfflineAudioTrack({
        lang: "fi",
        text: "Hyvää huomenta",
        contentType: "audio/mpeg",
        data: mp3Bytes,
      });
      expect(saved).toBe(true);

      const loaded = await getOfflineAudioTrack("fi", "Hyvää huomenta");
      expect(loaded).not.toBeNull();
      expect(loaded?.sizeBytes).toBe(256);

      const matched = await hasOfflineAudioKeys([
        "fi:Hyvää huomenta",
        "es:No existe",
      ]);
      expect(Array.from(matched)).toEqual(["fi:Hyvää huomenta"]);

      const stats = await getOfflineAudioStats();
      expect(stats).toEqual({ count: 1, totalBytes: 256 });

      await clearOfflineAudioTracks();
      expect(await getOfflineAudioStats()).toEqual({ count: 0, totalBytes: 0 });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
