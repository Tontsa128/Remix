import type { LanguageCode } from "@/types/elovio";

const SPEECH_LOCALE: Record<LanguageCode, string> = {
  fi: "fi-FI",
  es: "es-ES",
  en: "en-US",
};

let speechSeqId = 0;
let activeTimerId: number | null = null;
let activeWatchdogId: number | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesListenerBound = false;

function ensureVoicesLoaded(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (!voicesListenerBound) {
    voicesListenerBound = true;
    try {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        cachedVoices = window.speechSynthesis.getVoices();
      });
    } catch {
      // Ignore on environments without addEventListener on speechSynthesis
    }
  }
  const latest = window.speechSynthesis.getVoices();
  if (latest.length > 0) {
    cachedVoices = latest;
  }
  return cachedVoices;
}

function scoreVoice(voice: SpeechSynthesisVoice, lang: LanguageCode): number {
  const voiceLang = voice.lang.toLowerCase();
  const prefix = lang.toLowerCase();
  if (!voiceLang.startsWith(prefix)) return -1;

  let score = 0;
  const preferredExact = SPEECH_LOCALE[lang].toLowerCase();
  if (voiceLang === preferredExact) score += 30;
  else if (voiceLang === `${prefix}-${prefix}`) score += 25;
  else score += 10;

  const name = voice.name.toLowerCase();
  if (name.includes("natural") || name.includes("neural")) score += 40;
  if (name.includes("google")) score += 30;
  if (name.includes("microsoft") && name.includes("online")) score += 25;
  if (name.includes("enhanced") || name.includes("premium")) score += 25;
  if (voice.localService) score += 8;
  if (voice.default) score += 4;

  return score;
}

export function getBestVoice(lang: LanguageCode): SpeechSynthesisVoice | null {
  const voices = ensureVoicesLoaded();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const voice of voices) {
    const s = scoreVoice(voice, lang);
    if (s > bestScore) {
      bestScore = s;
      best = voice;
    }
  }
  return best;
}

export function hasVoiceForLanguage(lang: LanguageCode): boolean {
  const voices = ensureVoicesLoaded();
  if (voices.length === 0) return true; // Voices still lazy-loading
  return voices.some((v) =>
    v.lang.toLowerCase().startsWith(lang.toLowerCase()),
  );
}

function clearSpeechTimers(): void {
  if (activeTimerId !== null) {
    window.clearTimeout(activeTimerId);
    activeTimerId = null;
  }
  if (activeWatchdogId !== null) {
    window.clearInterval(activeWatchdogId);
    activeWatchdogId = null;
  }
}

export function cancelSpeech(): void {
  speechSeqId += 1;
  clearSpeechTimers();
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore cancellation failures
  }
}

export function unlockSpeechSynthesis(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    ensureVoicesLoaded();
    const primer = new SpeechSynthesisUtterance(" ");
    primer.volume = 0;
    primer.rate = 10;
    window.speechSynthesis.speak(primer);
  } catch {
    // Ignore restricted autoplay contexts
  }
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function speakText(
  text: string,
  lang: LanguageCode,
  options?: SpeakOptions,
): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
    options?.onEnd?.();
    return false;
  }

  speechSeqId += 1;
  const seq = speechSeqId;
  clearSpeechTimers();

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const bcp47 = SPEECH_LOCALE[lang];
    const rate = Math.max(0.6, Math.min(1.5, options?.rate ?? 0.94));
    utterance.lang = bcp47;
    utterance.rate = rate;
    utterance.pitch = options?.pitch ?? 1.0;

    const matched = getBestVoice(lang);
    if (matched) {
      utterance.voice = matched;
    }

    let finished = false;
    const finish = () => {
      if (finished || seq !== speechSeqId) return;
      finished = true;
      clearSpeechTimers();
      options?.onEnd?.();
    };

    utterance.onstart = () => {
      if (seq === speechSeqId) options?.onStart?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    // Account for slower playback rates so long phrases don't get cut early
    const estimatedMs = Math.round((text.length * 95) / rate + 1800);
    const safetyTimeout = Math.max(2200, Math.min(28000, estimatedMs));
    activeTimerId = window.setTimeout(finish, safetyTimeout);

    // Chrome desktop workaround for long utterances stalling around ~15s
    activeWatchdogId = window.setInterval(() => {
      if (seq !== speechSeqId) {
        clearSpeechTimers();
        return;
      }
      try {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignore browser-specific errors
      }
    }, 10000);

    options?.onStart?.();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    clearSpeechTimers();
    options?.onEnd?.();
    return false;
  }
}

export function speakAsync(
  text: string,
  lang: LanguageCode,
  options?: { rate?: number; signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve) => {
    if (options?.signal?.aborted) {
      resolve();
      return;
    }

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      options?.signal?.removeEventListener("abort", onAbort);
      resolve();
    };

    const onAbort = () => {
      cancelSpeech();
      done();
    };

    options?.signal?.addEventListener("abort", onAbort, { once: true });

    const started = speakText(text, lang, {
      rate: options?.rate ?? 0.94,
      onEnd: done,
    });
    if (!started) {
      done();
    }
  });
}

export function waitPause(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const onAbort = () => {
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function isSpeechRecognitionAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface DictationHandle {
  stop: () => void;
}

export function startSpeechDictation(options: {
  lang: LanguageCode;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): DictationHandle | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    options.onError(
      "Selain ei tue puheentunnistusta. Voit käyttää Live-tulkkia tai kirjoittaa tekstin.",
    );
    return null;
  }

  let stopped = false;
  const recognizer = new Ctor();
  recognizer.lang = SPEECH_LOCALE[options.lang];
  recognizer.continuous = false;
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;

  let collectedFinal = "";

  recognizer.onresult = (event) => {
    if (stopped) return;
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        collectedFinal += `${transcript} `;
      } else {
        interim += transcript;
      }
    }
    const trimmedInterim = interim.trim();
    if (trimmedInterim) {
      options.onInterim?.(trimmedInterim);
    }
  };

  recognizer.onerror = (event) => {
    if (stopped) return;
    const code = event?.error ?? "unknown";
    if (code === "not-allowed" || code === "service-not-allowed") {
      options.onError(
        "Salli mikrofoni selaimen sivustoasetuksista käyttääksesi sanelua.",
      );
    } else if (code === "no-speech") {
      options.onError("Puhetta ei kuultu. Yritä puhua lähempänä mikrofonia.");
    } else if (code !== "aborted") {
      options.onError("Puheentunnistus keskeytyi. Yritä uudelleen.");
    }
  };

  recognizer.onend = () => {
    if (!stopped && collectedFinal.trim()) {
      options.onFinal(collectedFinal.trim());
    }
    options.onEnd();
  };

  try {
    recognizer.start();
  } catch {
    options.onError("Puheentunnistusta ei voitu käynnistää.");
    return null;
  }

  return {
    stop: () => {
      stopped = true;
      try {
        recognizer.stop();
      } catch {
        // Ignore stop errors
      }
    },
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
}

function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:"'¡¿()\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i += 1) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = dp[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        (dp[j] ?? 0) + 1,
        (dp[j - 1] ?? 0) + 1,
        prev + cost,
      );
      prev = temp;
    }
  }
  return dp[n] ?? 0;
}

export function isFuzzyAnswerMatch(userInput: string, expected: string): boolean {
  const a = normalizeAnswer(userInput);
  const b = normalizeAnswer(expected);
  if (!a || !b) return false;
  if (a === b) return true;

  const dist = levenshtein(a, b);
  const maxAllowed = b.length <= 6 ? 1 : b.length <= 16 ? 2 : 3;
  return dist <= maxAllowed;
}
