// Silent WAV keep-alive + MediaSession earbud hardware button bridge + Screen Wake Lock

let silentAudioElement: HTMLAudioElement | null = null;
let silentBlobUrl: string | null = null;
let wakeLockSentinel: WakeLockSentinelLike | null = null;

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

function createSilentWavDataUrl(): string {
  // 1 second of silent 8kHz mono 8-bit PCM WAV (8044 bytes total, negligible footprint)
  const sampleRate = 8000;
  const numSamples = 8000;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(36, "data");
  view.setUint32(40, numSamples, true);

  // 8-bit unsigned PCM silence is 128
  for (let i = 44; i < 44 + numSamples; i += 1) {
    view.setUint8(i, 128);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export async function startEarbudKeepAlive(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (!silentAudioElement) {
      silentBlobUrl = createSilentWavDataUrl();
      const audio = new Audio(silentBlobUrl);
      audio.loop = true;
      audio.volume = 0.01;
      audio.setAttribute("playsinline", "true");
      silentAudioElement = audio;
    }
    await silentAudioElement.play();
  } catch {
    // Autoplay/background keepalive failed gracefully; speechSynthesis still continues
  }
}

export function stopEarbudKeepAlive(): void {
  if (silentAudioElement) {
    try {
      silentAudioElement.pause();
      silentAudioElement.currentTime = 0;
    } catch {
      // Ignore audio pause errors
    }
  }
}

export function disposeEarbudKeepAlive(): void {
  stopEarbudKeepAlive();
  if (silentBlobUrl) {
    try {
      URL.revokeObjectURL(silentBlobUrl);
    } catch {
      // Ignore revoke errors
    }
    silentBlobUrl = null;
  }
  silentAudioElement = null;
}

export function updateEarbudMediaSession(metadata: {
  title: string;
  artist: string;
  album: string;
  playbackState: "playing" | "paused" | "none";
}): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    if (typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        artwork: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });
    }
    navigator.mediaSession.playbackState = metadata.playbackState;
  } catch {
    // Ignore unsupported MediaSession metadata environments
  }
}

export function bindEarbudHardwareControls(handlers: {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplay?: () => void;
}): () => void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return () => {};
  }

  const actions: Array<[MediaSessionAction, (() => void) | null]> = [
    ["play", handlers.onPlay],
    ["pause", handlers.onPause],
    ["nexttrack", handlers.onNext],
    ["previoustrack", handlers.onPrevious],
    ["seekforward", handlers.onNext],
    ["seekbackward", handlers.onReplay ?? handlers.onPrevious],
  ];

  for (const [action, fn] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, fn);
    } catch {
      // Action may not be supported on all browsers
    }
  }

  return () => {
    for (const [action] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

export function isWakeLockSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "wakeLock" in navigator;
}

export async function acquireScreenWakeLock(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
    return false;
  }
  try {
    const wl = (
      navigator as unknown as {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    if (!wl) return false;
    wakeLockSentinel = await wl.request("screen");
    return true;
  } catch {
    return false;
  }
}

export async function releaseScreenWakeLock(): Promise<void> {
  if (!wakeLockSentinel) return;
  try {
    await wakeLockSentinel.release();
  } catch {
    // Ignore release errors
  } finally {
    wakeLockSentinel = null;
  }
}
