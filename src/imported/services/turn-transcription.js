import { encodePcm16Base64, REALTIME_AUDIO_SAMPLE_RATE } from "./realtime-audio";
import { requestElovioApi } from "./api-client";

function buildWav(pcmBuffers) {
    const totalBytes = pcmBuffers.reduce((sum, b) => sum + b.byteLength, 0);
    const wav = new ArrayBuffer(44 + totalBytes);
    const view = new DataView(wav);
    const writeText = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    writeText(0, "RIFF");
    view.setUint32(4, 36 + totalBytes, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, REALTIME_AUDIO_SAMPLE_RATE, true);
    view.setUint32(28, REALTIME_AUDIO_SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, "data");
    view.setUint32(40, totalBytes, true);
    let offset = 44;
    for (const buffer of pcmBuffers) {
        new Uint8Array(wav, offset, buffer.byteLength).set(new Uint8Array(buffer));
        offset += buffer.byteLength;
    }
    return wav;
}

// Turn-based transcription over Lovable AI: buffers one spoken turn of PCM16
// audio and transcribes it on commit. Replaces the original realtime socket.
export class TurnTranscriber {
    constructor(handlers) {
        this.handlers = handlers;
        this.buffers = [];
        this.closed = false;
        this.pending = Promise.resolve();
        this.turn = 0;
    }
    connect() {
        if (this.closed) return Promise.reject(new Error("Transcriber is closed"));
        return Promise.resolve();
    }
    appendAudio(buffer) {
        if (this.closed || buffer.byteLength === 0) return;
        this.buffers.push(buffer.slice(0));
    }
    commitAudio() {
        if (this.closed) return;
        const buffers = this.buffers;
        this.buffers = [];
        if (buffers.reduce((sum, b) => sum + b.byteLength, 0) < REALTIME_AUDIO_SAMPLE_RATE * 2 / 4) return; // < 0.25 s of audio
        const itemId = `turn-${++this.turn}`;
        this.pending = this.pending.then(async () => {
            if (this.closed) return;
            try {
                const wav = buildWav(buffers);
                const response = await requestElovioApi("/api/ai/transcribe", {
                    body: JSON.stringify({ audio: `data:audio/wav;base64,${encodePcm16Base64(wav)}` }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "transcription_failed");
                const text = typeof payload.transcript === "string" ? payload.transcript.trim() : "";
                if (text) {
                    this.handlers.onTranscript?.({
                        stage: "final",
                        transcript: text,
                        itemId,
                        ...(payload.detectedLanguage ? { detectedLanguage: payload.detectedLanguage } : {}),
                    });
                }
            }
            catch {
                this.handlers.onError?.("Transcription failed");
            }
        });
    }
    async flushAndClose(timeoutMs = 2_000, commitPendingAudio = true) {
        if (commitPendingAudio && this.buffers.length > 0) this.commitAudio();
        await Promise.race([this.pending, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
        this.close();
    }
    close() {
        if (this.closed) return;
        this.closed = true;
        this.buffers = [];
        this.handlers.onClose?.();
    }
}
