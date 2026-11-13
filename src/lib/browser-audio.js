import { useEffect, useRef, useState } from 'react';

export const AudioModule = {
  // Check permission state; if 'prompt' or unknown, trigger the native
  // getUserMedia prompt and immediately release the probe stream tracks.
  async requestRecordingPermissionsAsync() {
    if (!navigator.mediaDevices?.getUserMedia) return { granted: false };
    try {
      const status = await navigator.permissions?.query({ name: 'microphone' });
      if (status?.state === 'granted') return { granted: true };
      if (status?.state === 'denied') return { granted: false };
    } catch { /* permissions API unsupported — fall through to getUserMedia */ }
    try {
      const probeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      probeStream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch {
      return { granted: false };
    }
  },
};
export async function setAudioModeAsync() {}
export function useAudioPlayer() {
  const ref = useRef(null);
  if (!ref.current) {
    let audio = null;
    ref.current = {
      replace(url) { audio?.pause(); audio = new Audio(url); },
      play() { return audio?.play(); },
      pause() { audio?.pause(); },
      get element() { return audio; },
    };
  }
  useEffect(() => () => ref.current?.pause(), []);
  return ref.current;
}
export function useAudioPlayerStatus(player) {
  const [status, setStatus] = useState({ playing: false, didJustFinish: false });
  useEffect(() => {
    const interval = setInterval(() => {
      const audio = player.element;
      setStatus({ playing: Boolean(audio && !audio.paused), didJustFinish: Boolean(audio?.ended) });
    }, 200);
    return () => clearInterval(interval);
  }, [player]);
  return status;
}
export function useAudioStream({ onBuffer }) {
  const callback = useRef(onBuffer);
  callback.current = onBuffer;
  const ref = useRef(null);
  if (!ref.current) {
    let media = null;
    let context = null;
    let processor = null;
    let generation = 0;
    const cleanup = () => {
      processor?.disconnect();
      media?.getTracks().forEach((track) => track.stop());
      void context?.close().catch(() => undefined);
      context = null;
      media = null;
      processor = null;
    };
    ref.current = {
      isStreaming: false,
      async start() {
        const myGeneration = ++generation;
        try {
          media = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
          if (myGeneration !== generation) { cleanup(); return false; }
          context = new AudioContext();
          const input = context.createMediaStreamSource(media);
          processor = context.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (event) => {
            const samples = event.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(samples.length);
            for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 32767;
            callback.current({ data: pcm.buffer, sampleRate: context.sampleRate, channels: 1 });
          };
          input.connect(processor);
          processor.connect(context.destination);
          this.isStreaming = true;
          return true;
        } catch (error) {
          cleanup();
          this.isStreaming = false;
          throw error;
        }
      },
      stop() {
        generation++;
        cleanup();
        this.isStreaming = false;
      },
    };
  }
  useEffect(() => () => ref.current?.stop(), []);
  return { stream: ref.current };
}
