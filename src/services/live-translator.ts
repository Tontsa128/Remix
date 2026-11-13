import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { stopMicStream } from "@/services/mic";
import type {
  InterpreterStatus,
  LanguageCode,
  SpeakerRole,
} from "@/types/elovio";

const LIVE_MODEL = "gemini-3.5-live-translate-preview";

const WORKLET_PROCESSOR_CODE = `
class Pcm16kResamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._targetRate = 16000;
    this._chunkSamples = 1600; // ~100ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    const ratio = sampleRate / this._targetRate;

    if (ratio <= 1.01 && ratio >= 0.99) {
      for (let i = 0; i < channel.length; i++) {
        this._buffer.push(channel[i]);
      }
    } else {
      for (let pos = 0; pos < channel.length; pos += ratio) {
        const idx = Math.floor(pos);
        if (idx < channel.length) {
          this._buffer.push(channel[idx]);
        }
      }
    }

    while (this._buffer.length >= this._chunkSamples) {
      const slice = this._buffer.splice(0, this._chunkSamples);
      const pcm = new Int16Array(slice.length);
      let sum = 0;
      for (let i = 0; i < slice.length; i++) {
        const s = Math.max(-1, Math.min(1, slice[i]));
        sum += Math.abs(s);
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const level = Math.min(100, Math.round((sum / slice.length) * 320));
      this.port.postMessage({ buffer: pcm.buffer, level }, [pcm.buffer]);
    }

    return true;
  }
}
registerProcessor("pcm-16k-processor", Pcm16kResamplerProcessor);
`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function downsampleTo16kPcm(
  float32: Float32Array,
  inputSampleRate: number,
): { buffer: ArrayBuffer; level: number } {
  const ratio = inputSampleRate / 16000;
  const outLength = Math.max(1, Math.floor(float32.length / ratio));
  const pcm = new Int16Array(outLength);
  let sum = 0;
  for (let i = 0; i < outLength; i += 1) {
    const idx = Math.min(float32.length - 1, Math.floor(i * ratio));
    const s = Math.max(-1, Math.min(1, float32[idx] ?? 0));
    sum += Math.abs(s);
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return {
    buffer: pcm.buffer,
    level: Math.min(100, Math.round((sum / outLength) * 320)),
  };
}

interface LiveSessionCallbacks {
  onStatus: (status: InterpreterStatus) => void;
  onLevel: (level: number) => void;
  onTranscriptUpdate: (payload: {
    speaker: SpeakerRole;
    sourceLang: LanguageCode;
    targetLang: LanguageCode;
    inputDelta?: string;
    outputDelta?: string;
    turnComplete?: boolean;
  }) => void;
  onError: (message: string) => void;
}

export class DualLiveTranslator {
  private nativeLang: LanguageCode;
  private otherLang: LanguageCode;
  private callbacks: LiveSessionCallbacks;

  private activeSpeaker: SpeakerRole = "self";
  private sessionToOther: Session | null = null;
  private sessionToNative: Session | null = null;

  private micStream: MediaStream | null = null;
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletUrl: string | null = null;

  private nextPlaybackTime = 0;
  private muteUntilMs = 0;
  private isStopping = false;
  private hasAttemptedReconnect = false;
  private activeSources = new Set<AudioBufferSourceNode>();

  constructor(params: {
    nativeLang: LanguageCode;
    otherLang: LanguageCode;
    callbacks: LiveSessionCallbacks;
  }) {
    this.nativeLang = params.nativeLang;
    this.otherLang = params.otherLang;
    this.callbacks = params.callbacks;
  }

  public setSpeaker(speaker: SpeakerRole): void {
    this.activeSpeaker = speaker;
  }

  public async start(existingMicStream: MediaStream): Promise<void> {
    this.isStopping = false;
    this.micStream = existingMicStream;
    this.callbacks.onStatus("connecting");

    try {
      await this.connectBothSessions();
      await this.setupAudioPipeline(existingMicStream);
      this.callbacks.onStatus("listening");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Live-tulkkia ei voitu yhdistää. Käytä tekstikäännöstä alla.";
      await this.stop();
      this.callbacks.onStatus("error");
      this.callbacks.onError(msg);
    }
  }

  private async fetchEphemeralToken(target: LanguageCode): Promise<string> {
    const res = await fetch(
      `/api/live-token?target=${encodeURIComponent(target)}`,
      { cache: "no-store" },
    );
    const data = (await res.json().catch(() => ({}))) as {
      token?: string;
      message?: string;
    };
    if (!res.ok || !data.token) {
      throw new Error(
        data.message ||
          "Live-tulkin käyttöönotto epäonnistui (tarkista palvelimen GEMINI_API_KEY).",
      );
    }
    return data.token;
  }

  private async openSingleSession(
    target: LanguageCode,
    speaker: SpeakerRole,
    sourceLang: LanguageCode,
  ): Promise<Session> {
    const token = await this.fetchEphemeralToken(target);
    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: "v1alpha" },
    });

    return ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        translationConfig: {
          targetLanguageCode: target,
          echoTargetLanguage: false,
        },
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          this.handleServerMessage(message, speaker, sourceLang, target);
        },
        onerror: () => {
          void this.handleDisconnect();
        },
        onclose: () => {
          void this.handleDisconnect();
        },
      },
    });
  }

  private async connectBothSessions(): Promise<void> {
    const [toOther, toNative] = await Promise.all([
      this.openSingleSession(this.otherLang, "self", this.nativeLang),
      this.openSingleSession(this.nativeLang, "other", this.otherLang),
    ]);
    this.sessionToOther = toOther;
    this.sessionToNative = toNative;
  }

  private async handleDisconnect(): Promise<void> {
    if (this.isStopping) return;

    if (!this.hasAttemptedReconnect && this.micStream) {
      this.hasAttemptedReconnect = true;
      this.callbacks.onStatus("connecting");
      this.closeSessionsOnly();
      try {
        await this.connectBothSessions();
        this.callbacks.onStatus("listening");
        return;
      } catch {
        // Fall through to error notice
      }
    }

    await this.stop();
    this.callbacks.onStatus("error");
    this.callbacks.onError(
      "Live-yhteys katkesi eikä palautunut. Voit jatkaa alla olevalla teksti- tai puhekäännöksellä.",
    );
  }

  private handleServerMessage(
    message: LiveServerMessage,
    speaker: SpeakerRole,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
  ): void {
    const content = message.serverContent;
    if (!content) return;

    if (content.interrupted) {
      this.clearPlaybackQueue();
    }

    const inputText = content.inputTranscription?.text ?? "";
    const outputText = content.outputTranscription?.text ?? "";

    if (inputText || outputText) {
      this.callbacks.onStatus(outputText ? "translating" : "listening");
      this.callbacks.onTranscriptUpdate({
        speaker,
        sourceLang,
        targetLang,
        inputDelta: inputText,
        outputDelta: outputText,
        turnComplete: Boolean(content.turnComplete),
      });
    } else if (content.turnComplete) {
      this.callbacks.onTranscriptUpdate({
        speaker,
        sourceLang,
        targetLang,
        turnComplete: true,
      });
    }

    for (const part of content.modelTurn?.parts ?? []) {
      const base64Audio = part.inlineData?.data;
      if (base64Audio) {
        this.enqueuePcm24kAudio(base64Audio);
      }
    }
  }

  private ensureOutputAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.outputCtx || this.outputCtx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.outputCtx = new AudioCtx({ sampleRate: 24000 });
      this.nextPlaybackTime = this.outputCtx.currentTime;
    }
    if (this.outputCtx.state === "suspended") {
      void this.outputCtx.resume();
    }
    return this.outputCtx;
  }

  private enqueuePcm24kAudio(base64: string): void {
    const ctx = this.ensureOutputAudioContext();
    if (!ctx) return;

    const pcm16 = base64ToInt16Array(base64);
    if (pcm16.length === 0) return;

    const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
    const floatChannel = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i += 1) {
      floatChannel[i] = (pcm16[i] ?? 0) / 0x8000;
    }

    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.01, this.nextPlaybackTime);
    this.nextPlaybackTime = startAt + audioBuffer.duration;

    // Mute microphone outbound streaming while translated speech plays (+180ms tail)
    const remainingMs = (this.nextPlaybackTime - now) * 1000 + 180;
    this.muteUntilMs = Math.max(this.muteUntilMs, Date.now() + remainingMs);
    this.callbacks.onStatus("playing");

    this.activeSources.add(src);
    src.onended = () => {
      this.activeSources.delete(src);
      if (this.activeSources.size === 0 && !this.isStopping) {
        this.callbacks.onStatus("listening");
      }
    };

    src.start(startAt);
  }

  private clearPlaybackQueue(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // Ignore already-stopped source
      }
    }
    this.activeSources.clear();
    if (this.outputCtx) {
      this.nextPlaybackTime = this.outputCtx.currentTime;
    }
    this.muteUntilMs = 0;
  }

  private sendPcmChunk(buffer: ArrayBuffer, level: number): void {
    if (this.isStopping) return;
    // Prevent echo while playing back translated audio
    if (Date.now() < this.muteUntilMs) {
      this.callbacks.onLevel(0);
      return;
    }
    this.callbacks.onLevel(level);

    const session =
      this.activeSpeaker === "self"
        ? this.sessionToOther
        : this.sessionToNative;
    if (!session) return;

    const base64 = arrayBufferToBase64(buffer);
    try {
      session.sendRealtimeInput({
        audio: {
          data: base64,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch {
      // Handled via socket close/error listeners
    }
  }

  private async setupAudioPipeline(stream: MediaStream): Promise<void> {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      throw new Error("Selain ei tue Web Audio -äänenkäsittelyä.");
    }

    this.inputCtx = new AudioCtx({ sampleRate: 16000 });
    if (this.inputCtx.state === "suspended") {
      await this.inputCtx.resume();
    }

    this.sourceNode = this.inputCtx.createMediaStreamSource(stream);

    const silentSink = this.inputCtx.createGain();
    silentSink.gain.value = 0;
    silentSink.connect(this.inputCtx.destination);

    if (this.inputCtx.audioWorklet) {
      try {
        const blob = new Blob([WORKLET_PROCESSOR_CODE], {
          type: "application/javascript",
        });
        this.workletUrl = URL.createObjectURL(blob);
        await this.inputCtx.audioWorklet.addModule(this.workletUrl);
        this.workletNode = new AudioWorkletNode(
          this.inputCtx,
          "pcm-16k-processor",
        );
        this.workletNode.port.onmessage = (
          ev: MessageEvent<{ buffer: ArrayBuffer; level: number }>,
        ) => {
          this.sendPcmChunk(ev.data.buffer, ev.data.level);
        };
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(silentSink);
        return;
      } catch {
        // Fallback below if worklet registration fails
      }
    }

    const processor = this.inputCtx.createScriptProcessor(2048, 1, 1);
    const actualRate = this.inputCtx.sampleRate;
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const { buffer, level } = downsampleTo16kPcm(input, actualRate);
      this.sendPcmChunk(buffer, level);
    };
    this.scriptProcessor = processor;
    this.sourceNode.connect(processor);
    processor.connect(silentSink);
  }

  private closeSessionsOnly(): void {
    try {
      this.sessionToOther?.close();
    } catch {
      // Ignore close errors
    }
    try {
      this.sessionToNative?.close();
    } catch {
      // Ignore close errors
    }
    this.sessionToOther = null;
    this.sessionToNative = null;
  }

  public async stop(): Promise<void> {
    this.isStopping = true;
    this.closeSessionsOnly();
    this.clearPlaybackQueue();

    try {
      this.workletNode?.disconnect();
    } catch {
      // Ignore
    }
    this.workletNode = null;

    if (this.workletUrl) {
      URL.revokeObjectURL(this.workletUrl);
      this.workletUrl = null;
    }

    try {
      this.scriptProcessor?.disconnect();
    } catch {
      // Ignore
    }
    this.scriptProcessor = null;

    try {
      this.sourceNode?.disconnect();
    } catch {
      // Ignore
    }
    this.sourceNode = null;

    try {
      await this.inputCtx?.close();
    } catch {
      // Ignore
    }
    this.inputCtx = null;

    try {
      await this.outputCtx?.close();
    } catch {
      // Ignore
    }
    this.outputCtx = null;

    stopMicStream(this.micStream);
    this.micStream = null;
    this.callbacks.onLevel(0);
    this.callbacks.onStatus("idle");
  }
}
