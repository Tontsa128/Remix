// Expo AV–compatible Background Audio Service for Web / PWA (react-native-web)
// Implements Expo AV AudioMode & Sound status semantics backed by a single unlocked
// HTMLAudioElement, MediaSession hardware controls, and silent MP3 frame pacing
// so mobile browsers keep playing Spanish, English, and Finnish audio when the screen is off.

export const InterruptionModeIOS = {
  MixWithOthers: 0,
  DoNotMix: 1,
  DuckOthers: 2,
} as const;

export const InterruptionModeAndroid = {
  DoNotMix: 1,
  DuckOthers: 2,
} as const;

export interface ExpoAudioModeConfig {
  allowsRecordingIOS?: boolean;
  staysActiveInBackground: boolean;
  playsInSilentModeIOS: boolean;
  interruptionModeIOS?: number;
  interruptionModeAndroid?: number;
  shouldDuckAndroid?: boolean;
  playThroughEarpieceAndroid?: boolean;
}

export interface AVPlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  didJustFinish: boolean;
  positionMillis: number;
  durationMillis: number;
  rate: number;
  error?: string;
}

export type PlaybackStatusListener = (status: AVPlaybackStatus) => void;

const DEFAULT_AUDIO_MODE: ExpoAudioModeConfig = {
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
};

let currentAudioMode: ExpoAudioModeConfig = { ...DEFAULT_AUDIO_MODE };
let sharedMediaElement: HTMLAudioElement | null = null;
let backgroundAudioCtx: AudioContext | null = null;
let visibilityBound = false;

// Valid MPEG-2 Layer III 64kbps 24kHz mono silent frame = 192 bytes (~24 ms)
const SILENT_MP3_FRAME = (() => {
  const frame = new Uint8Array(192);
  frame[0] = 0xff;
  frame[1] = 0xf3;
  frame[2] = 0x84;
  frame[3] = 0xc4;
  return frame;
})();

const silentGapUrlCache = new Map<number, string>();

export function getSilentMp3GapUrl(durationMs: number): string | null {
  if (typeof window === "undefined" || typeof Blob === "undefined") return null;
  const clampedMs = Math.max(48, Math.min(10000, Math.round(durationMs / 24) * 24));
  const cached = silentGapUrlCache.get(clampedMs);
  if (cached) return cached;

  const frameCount = Math.max(2, Math.round(clampedMs / 24));
  const out = new Uint8Array(frameCount * SILENT_MP3_FRAME.length);
  for (let i = 0; i < frameCount; i += 1) {
    out.set(SILENT_MP3_FRAME, i * SILENT_MP3_FRAME.length);
  }
  const blob = new Blob([out], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  silentGapUrlCache.set(clampedMs, url);
  return url;
}

function getOrCreateSharedAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof window.Audio === "undefined") {
    return null;
  }
  if (!sharedMediaElement) {
    const audio = new window.Audio();
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    if ("preservesPitch" in audio) {
      (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
    }
    sharedMediaElement = audio;
  }
  return sharedMediaElement;
}

function ensureVisibilityHandler(): void {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    if (!currentAudioMode.staysActiveInBackground) return;
    if (backgroundAudioCtx && backgroundAudioCtx.state === "suspended") {
      void backgroundAudioCtx.resume().catch(() => undefined);
    }
  });
}

export const Audio = {
  async setAudioModeAsync(config: Partial<ExpoAudioModeConfig>): Promise<void> {
    currentAudioMode = {
      ...currentAudioMode,
      ...config,
    };

    if (typeof window === "undefined") return;
    ensureVisibilityHandler();

    if (currentAudioMode.staysActiveInBackground) {
      getOrCreateSharedAudioElement();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          if (!backgroundAudioCtx) {
            backgroundAudioCtx = new AudioCtx();
          }
          if (backgroundAudioCtx.state === "suspended") {
            await backgroundAudioCtx.resume();
          }
        } catch {
          // AudioContext resume may wait for first user tap
        }
      }
    }
  },

  getAudioMode(): ExpoAudioModeConfig {
    return { ...currentAudioMode };
  },

  Sound: {
    async createAsync(
      source: { uri: string },
      initialStatus?: {
        shouldPlay?: boolean;
        rate?: number;
        volume?: number;
      },
      onPlaybackStatusUpdate?: PlaybackStatusListener,
    ): Promise<{ sound: BackgroundSoundHandle; status: AVPlaybackStatus }> {
      const sound = new BackgroundSoundHandle(
        source.uri,
        onPlaybackStatusUpdate,
      );
      await sound.loadAsync(initialStatus);
      if (initialStatus?.shouldPlay) {
        await sound.playAsync();
      }
      return { sound, status: sound.getStatusSnapshot() };
    },
  },
};

export class BackgroundSoundHandle {
  private uri: string;
  private listener: PlaybackStatusListener | undefined;
  private isLoaded = false;
  private didJustFinish = false;
  private rate = 1.0;
  private volume = 1.0;
  private disposed = false;

  constructor(uri: string, listener?: PlaybackStatusListener) {
    this.uri = uri;
    this.listener = listener;
  }

  setOnPlaybackStatusUpdate(listener?: PlaybackStatusListener): void {
    this.listener = listener;
  }

  getStatusSnapshot(): AVPlaybackStatus {
    const el = sharedMediaElement;
    const isCurrent = el && el.src === this.uri;
    return {
      isLoaded: this.isLoaded && !this.disposed,
      isPlaying: Boolean(isCurrent && el && !el.paused && !el.ended),
      didJustFinish: this.didJustFinish,
      positionMillis: isCurrent && el ? Math.round((el.currentTime || 0) * 1000) : 0,
      durationMillis:
        isCurrent && el && Number.isFinite(el.duration)
          ? Math.round(el.duration * 1000)
          : 0,
      rate: this.rate,
    };
  }

  private emitStatus(extra?: Partial<AVPlaybackStatus>): void {
    if (this.disposed) return;
    this.listener?.({
      ...this.getStatusSnapshot(),
      ...extra,
    });
  }

  async loadAsync(initialStatus?: {
    rate?: number;
    volume?: number;
  }): Promise<void> {
    const el = getOrCreateSharedAudioElement();
    if (!el || this.disposed) return;

    this.rate = Math.max(0.65, Math.min(1.4, initialStatus?.rate ?? 1.0));
    this.volume = Math.max(0, Math.min(1, initialStatus?.volume ?? 1.0));
    this.didJustFinish = false;

    el.src = this.uri;
    el.playbackRate = this.rate;
    el.volume = this.volume;
    el.currentTime = 0;
    this.isLoaded = true;
    this.emitStatus();
  }

  async playAsync(): Promise<void> {
    const el = getOrCreateSharedAudioElement();
    if (!el || this.disposed) return;

    if (el.src !== this.uri) {
      el.src = this.uri;
    }
    el.playbackRate = this.rate;
    el.volume = this.volume;

    try {
      await el.play();
      this.emitStatus({ isPlaying: true, didJustFinish: false });
    } catch (err) {
      this.emitStatus({
        isPlaying: false,
        error: err instanceof Error ? err.message : "Audio playback failed",
      });
      throw err;
    }
  }

  async pauseAsync(): Promise<void> {
    const el = sharedMediaElement;
    if (!el || this.disposed) return;
    try {
      el.pause();
      this.emitStatus({ isPlaying: false });
    } catch {
      // Ignore pause errors
    }
  }

  async stopAsync(): Promise<void> {
    const el = sharedMediaElement;
    if (!el || this.disposed) return;
    try {
      el.pause();
      el.currentTime = 0;
      this.emitStatus({ isPlaying: false, positionMillis: 0 });
    } catch {
      // Ignore stop errors
    }
  }

  async setRateAsync(nextRate: number): Promise<void> {
    this.rate = Math.max(0.65, Math.min(1.4, nextRate));
    if (sharedMediaElement && sharedMediaElement.src === this.uri) {
      sharedMediaElement.playbackRate = this.rate;
    }
    this.emitStatus({ rate: this.rate });
  }

  async unloadAsync(): Promise<void> {
    this.disposed = true;
    this.isLoaded = false;
  }
}

export async function playUriUntilFinished(params: {
  uri: string;
  rate?: number;
  volume?: number;
  signal?: AbortSignal;
}): Promise<boolean> {
  const el = getOrCreateSharedAudioElement();
  if (!el || params.signal?.aborted) return false;

  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  });

  return new Promise((resolve) => {
    let settled = false;
    let watchdog: number | null = null;
    let soundHandle: BackgroundSoundHandle | null = null;

    const cleanup = () => {
      if (watchdog !== null) {
        window.clearTimeout(watchdog);
        watchdog = null;
      }
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      params.signal?.removeEventListener("abort", onAbort);
      if (soundHandle) {
        void soundHandle.unloadAsync();
      }
    };

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };

    const onEnded = () => finish(true);
    const onError = () => finish(false);
    const onAbort = () => {
      try {
        el.pause();
      } catch {
        // Ignore abort pause errors
      }
      finish(true);
    };

    params.signal?.addEventListener("abort", onAbort, { once: true });
    el.addEventListener("ended", onEnded, { once: true });
    el.addEventListener("error", onError, { once: true });

    watchdog = window.setTimeout(() => finish(true), 28_000);

    const createOpts: {
      shouldPlay: boolean;
      rate?: number;
      volume?: number;
    } = { shouldPlay: true };
    if (params.rate !== undefined) createOpts.rate = params.rate;
    if (params.volume !== undefined) createOpts.volume = params.volume;

    Audio.Sound.createAsync({ uri: params.uri }, createOpts)
      .then(({ sound }) => {
        soundHandle = sound;
      })
      .catch(() => finish(false));
  });
}

// Plays silent MP3 frames on the same active background audio element so mobile browsers
// do not suspend the JS loop or drop the lock-screen MediaSession during recall pauses.
export async function playBackgroundSilenceGap(
  durationMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (durationMs <= 0 || signal?.aborted) return;
  const gapUrl = getSilentMp3GapUrl(durationMs);
  if (!gapUrl) {
    await new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, durationMs);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    });
    return;
  }

  const played = await playUriUntilFinished({
    uri: gapUrl,
    rate: 1.0,
    volume: 0.02,
    ...(signal ? { signal } : {}),
  });

  if (!played && !signal?.aborted) {
    await new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, durationMs);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    });
  }
}

export function stopBackgroundAudioSession(): void {
  if (sharedMediaElement) {
    try {
      sharedMediaElement.pause();
      sharedMediaElement.currentTime = 0;
    } catch {
      // Ignore stop errors
    }
  }
}
