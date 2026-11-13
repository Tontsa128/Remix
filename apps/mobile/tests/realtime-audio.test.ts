import assert from "node:assert/strict";
import test from "node:test";
import {
  encodePcm16Base64,
  isPcm16SpeechFrame,
  measurePcm16Rms,
  Pcm16StreamResampler,
  REALTIME_AUDIO_CHANNELS,
  REALTIME_AUDIO_ENCODING,
  REALTIME_AUDIO_SAMPLE_RATE,
} from "../src/services/realtime-audio";

function pcm16(...samples: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  samples.forEach((sample, index) => view.setInt16(index * 2, sample, true));
  return buffer;
}

test("declares the exact mono PCM16 format required by the realtime session", () => {
  assert.equal(REALTIME_AUDIO_SAMPLE_RATE, 24_000);
  assert.equal(REALTIME_AUDIO_CHANNELS, 1);
  assert.equal(REALTIME_AUDIO_ENCODING, "pcm16");
});

test("encodes PCM bytes to base64 with correct padding", () => {
  assert.equal(encodePcm16Base64(new ArrayBuffer(0)), "");
  assert.equal(encodePcm16Base64(pcm16(0)), "AAA=");
  assert.equal(encodePcm16Base64(pcm16(1)), "AQA=");
  assert.equal(encodePcm16Base64(pcm16(-1)), "//8=");
});

test("measures normalized PCM16 RMS", () => {
  assert.equal(measurePcm16Rms(new ArrayBuffer(0)), 0);
  assert.equal(measurePcm16Rms(pcm16(0, 0)), 0);
  assert.ok(Math.abs(measurePcm16Rms(pcm16(16384, -16384)) - 0.5) < 0.000001);
  assert.equal(measurePcm16Rms(pcm16(-32768)), 1);
});

test("classifies silence and speech frames using the configured threshold", () => {
  assert.equal(isPcm16SpeechFrame(pcm16(0, 10, -10)), false);
  assert.equal(isPcm16SpeechFrame(pcm16(12000, -12000)), true);
  assert.equal(isPcm16SpeechFrame(pcm16(1000), 0.1), false);
});

test("rejects malformed PCM16 buffers and invalid VAD thresholds", () => {
  assert.throws(() => encodePcm16Base64(new ArrayBuffer(1)), RangeError);
  assert.throws(() => measurePcm16Rms(new ArrayBuffer(1)), RangeError);
  assert.throws(() => isPcm16SpeechFrame(pcm16(0), -0.1), RangeError);
  assert.throws(() => isPcm16SpeechFrame(pcm16(0), 1.1), RangeError);
});


test("resamples 48 kHz mono PCM16 into the 24 kHz realtime format across chunks", () => {
  const resampler = new Pcm16StreamResampler(48_000, 24_000);
  const first = resampler.process(pcm16(1000, 2000, 3000, 4000));
  const second = resampler.process(pcm16(5000, 6000, 7000, 8000));
  const samples = [...new Int16Array(first), ...new Int16Array(second)];
  assert.deepEqual(samples, [1500, 3500, 5500, 7500]);
});

test("downmixes interleaved stereo PCM16 to mono", () => {
  const resampler = new Pcm16StreamResampler(24_000, 24_000, 2);
  const stereo = new ArrayBuffer(6 * 2);
  const view = new DataView(stereo);
  [1000, 3000, -1000, 1000, 2000, 2000].forEach((sample, index) => view.setInt16(index * 2, sample, true));
  const mono = resampler.process(stereo);
  assert.deepEqual([...new Int16Array(mono)], [2000, 0]);
});

test("rejects invalid resampler configuration and malformed channel data", () => {
  assert.throws(() => new Pcm16StreamResampler(0, 24_000), RangeError);
  assert.throws(() => new Pcm16StreamResampler(48_000, 24_000, 0), RangeError);
  assert.throws(() => new Pcm16StreamResampler(48_000, 24_000, 2).process(new ArrayBuffer(2)), RangeError);
});
