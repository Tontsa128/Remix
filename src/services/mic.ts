import type { MicErrorKind, MicPermissionState } from "@/types/elovio";

export interface MicRequestResult {
  ok: boolean;
  stream?: MediaStream;
  errorKind?: MicErrorKind;
  errorMessage?: string;
}

export function mapMicError(err: unknown): {
  errorKind: MicErrorKind;
  errorMessage: string;
} {
  const name =
    typeof err === "object" && err !== null && "name" in err
      ? String((err as { name?: unknown }).name ?? "")
      : "";

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    name === "PermissionDenied" ||
    name === "SecurityError"
  ) {
    return {
      errorKind: "NotAllowedError",
      errorMessage:
        "Salli mikrofoni selaimen sivustoasetuksista (osoitepalkin lukko- tai asetukset-kuvake) ja päivitä sivu.",
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      errorKind: "NotFoundError",
      errorMessage:
        "Mikrofonia ei löytynyt. Tarkista, että laitteessa on toimiva mikrofoni.",
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      errorKind: "NotReadableError",
      errorMessage:
        "Toinen sovellus käyttää mikrofonia juuri nyt. Sulje muut äänisovellukset ja yritä uudelleen.",
    };
  }

  return {
    errorKind: "UnknownError",
    errorMessage:
      "Mikrofonin käynnistys epäonnistui. Tarkista laitteen ääniasetukset.",
  };
}

export async function checkMicPermission(): Promise<MicPermissionState> {
  if (
    typeof navigator === "undefined" ||
    !navigator.permissions?.query
  ) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    if (
      status.state === "granted" ||
      status.state === "denied" ||
      status.state === "prompt"
    ) {
      return status.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function requestMicStream(): Promise<MicRequestResult> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return {
      ok: false,
      errorKind: "UnsupportedError",
      errorMessage: "Selain ei tue mikrofonin käyttöä tässä näkymässä.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return { ok: true, stream };
  } catch (err) {
    const errName =
      typeof err === "object" && err !== null && "name" in err
        ? String((err as { name?: unknown }).name ?? "")
        : "";
    if (
      errName === "OverconstrainedError" ||
      errName === "ConstraintNotSatisfiedError"
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        return { ok: true, stream };
      } catch (fallbackErr) {
        const mapped = mapMicError(fallbackErr);
        return { ok: false, ...mapped };
      }
    }
    const mapped = mapMicError(err);
    return { ok: false, ...mapped };
  }
}

export function stopMicStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Ignore already-stopped track errors
    }
  }
}

export interface AudioLevelMonitor {
  stop: () => void;
}

export function startAudioLevelMonitor(
  stream: MediaStream,
  onLevel: (level: number) => void,
): AudioLevelMonitor {
  if (typeof window === "undefined") {
    return { stop: () => undefined };
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) {
    return { stop: () => undefined };
  }

  let closed = false;
  let rafId = 0;
  let audioCtx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;

  try {
    audioCtx = new AudioCtx();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.45;

    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bins = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (closed) return;
      analyser.getByteFrequencyData(bins);
      let sum = 0;
      for (let i = 0; i < bins.length; i += 1) {
        sum += bins[i] ?? 0;
      }
      const avg = bins.length > 0 ? sum / bins.length : 0;
      const pct = Math.min(100, Math.round((avg / 110) * 100));
      onLevel(pct);
      rafId = requestAnimationFrame(tick);
    };

    tick();
  } catch {
    return { stop: () => undefined };
  }

  return {
    stop: () => {
      closed = true;
      if (rafId) cancelAnimationFrame(rafId);
      onLevel(0);
      try {
        source?.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      try {
        void audioCtx?.close();
      } catch {
        // Ignore close errors
      }
    },
  };
}
