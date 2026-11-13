/**
 * Audio format required by Elovio's OpenAI Realtime transcription session.
 * Keep these values aligned with api/_lib/realtime-transcription-provider.ts.
 */
export const REALTIME_AUDIO_SAMPLE_RATE = 24_000;
export const REALTIME_AUDIO_CHANNELS = 1;
export const REALTIME_AUDIO_ENCODING = "pcm16" as const;

/** Encode a mono PCM16 ArrayBuffer as base64 without relying on browser-only APIs. */
export function encodePcm16Base64(buffer: ArrayBuffer): string {
  if (buffer.byteLength % 2 !== 0) {
    throw new RangeError("PCM16 data must contain complete 16-bit samples");
  }

  const bytes = new Uint8Array(buffer);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const second = hasSecond ? bytes[index + 1] : 0;
    const third = hasThird ? bytes[index + 2] : 0;

    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 0x03) << 4) | (second >> 4)];
    encoded += hasSecond
      ? alphabet[((second & 0x0f) << 2) | (third >> 6)]
      : "=";
    encoded += hasThird ? alphabet[third & 0x3f] : "=";
  }

  return encoded;
}

/** Return normalized RMS amplitude (0..1) for little-endian signed PCM16. */
export function measurePcm16Rms(buffer: ArrayBuffer): number {
  if (buffer.byteLength % 2 !== 0) {
    throw new RangeError("PCM16 data must contain complete 16-bit samples");
  }
  const sampleCount = buffer.byteLength / 2;
  if (sampleCount === 0) return 0;

  const view = new DataView(buffer);
  let sumSquares = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = view.getInt16(index * 2, true) / 32768;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / sampleCount);
}

/** Basic client-side VAD signal; callers must tune threshold on real devices. */
export function isPcm16SpeechFrame(buffer: ArrayBuffer, threshold = 0.012): boolean {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError("VAD threshold must be between 0 and 1");
  }
  return measurePcm16Rms(buffer) >= threshold;
}


/**
 * Stateful PCM16 resampler for live microphone chunks. It preserves the
 * fractional source position between chunks and downmixes interleaved input
 * channels to mono for the Realtime API.
 */
export class Pcm16StreamResampler {
  private position: number;
  private previousFrame: number[] | null = null;
  private readonly sourceStep: number;

  constructor(
    private readonly sourceSampleRate: number,
    private readonly targetSampleRate: number,
    private readonly channels = 1,
  ) {
    if (!Number.isFinite(sourceSampleRate) || sourceSampleRate <= 0 ||
        !Number.isFinite(targetSampleRate) || targetSampleRate <= 0 ||
        !Number.isInteger(channels) || channels < 1 || channels > 8) {
      throw new RangeError("Invalid PCM16 resampler configuration");
    }
    this.sourceStep = sourceSampleRate / targetSampleRate;
    // Sample at the centre of each source interval when downsampling to
    // avoid simply dropping every second sample on common 48 kHz devices.
    this.position = Math.max(0, (this.sourceStep - 1) / 2);
  }

  process(buffer: ArrayBuffer): ArrayBuffer {
    if (buffer.byteLength % (2 * this.channels) !== 0) {
      throw new RangeError("PCM16 data does not match the configured channel count");
    }
    const frameCount = buffer.byteLength / (2 * this.channels);
    if (frameCount === 0) return new ArrayBuffer(0);

    const view = new DataView(buffer);
    const hasPrevious = this.previousFrame !== null;
    const combinedFrameCount = frameCount + (hasPrevious ? 1 : 0);
    const sampleAt = (frame: number, channel: number): number => {
      if (hasPrevious && frame === 0) return this.previousFrame![channel];
      const sourceFrame = frame - (hasPrevious ? 1 : 0);
      return view.getInt16((sourceFrame * this.channels + channel) * 2, true);
    };

    const output: number[] = [];
    while (this.position < combinedFrameCount - 1) {
      const left = Math.floor(this.position);
      const fraction = this.position - left;
      let mixed = 0;
      for (let channel = 0; channel < this.channels; channel += 1) {
        const first = sampleAt(left, channel);
        const second = sampleAt(left + 1, channel);
        mixed += first + (second - first) * fraction;
      }
      const mono = Math.max(-32768, Math.min(32767, Math.round(mixed / this.channels)));
      output.push(mono);
      this.position += this.sourceStep;
    }

    this.position -= hasPrevious ? frameCount : frameCount - 1;
    this.previousFrame = Array.from({ length: this.channels }, (_, channel) =>
      view.getInt16(((frameCount - 1) * this.channels + channel) * 2, true),
    );

    const result = new ArrayBuffer(output.length * 2);
    const resultView = new DataView(result);
    output.forEach((sample, index) => resultView.setInt16(index * 2, sample, true));
    return result;
  }
}
