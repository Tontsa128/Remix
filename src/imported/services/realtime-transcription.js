import { encodePcm16Base64 } from "./realtime-audio";
const SOCKET_OPEN = 1;
function detectedLanguage(value) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value.toLowerCase().split("-")[0];
    return normalized === "fi" || normalized === "es" || normalized === "en"
        ? normalized
        : undefined;
}
export function parseRealtimeTranscriptionEvent(raw) {
    if (typeof raw !== "string")
        return null;
    let event;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            return null;
        event = parsed;
    }
    catch {
        return null;
    }
    const type = event.type;
    if (type !== "conversation.item.input_audio_transcription.delta" &&
        type !== "conversation.item.input_audio_transcription.completed")
        return null;
    const isPartial = type.endsWith(".delta");
    const text = isPartial ? event.delta : event.transcript;
    if (typeof text !== "string" || !text.trim())
        return null;
    const firstLanguage = Array.isArray(event.languages) ? event.languages[0] : undefined;
    const languageValue = event.language ??
        (firstLanguage && typeof firstLanguage === "object" && !Array.isArray(firstLanguage)
            ? firstLanguage.code
            : firstLanguage);
    const language = detectedLanguage(languageValue);
    return {
        stage: isPartial ? "partial" : "final",
        transcript: text,
        ...(typeof event.item_id === "string" ? { itemId: event.item_id } : {}),
        ...(language ? { detectedLanguage: language } : {}),
    };
}
export class RealtimeTranscriptionSocket {
    url;
    ephemeralSecret;
    socket = null;
    ready = false;
    handlers;
    factory;
    pendingFlushResolver = null;
    pendingCommitCount = 0;
    pendingTranscriptItemIds = new Set();
    pendingTranscriptOrder = [];
    completedTranscripts = new Map();
    failedTranscriptItemIds = new Set();
    constructor(url, ephemeralSecret, handlers, factory) {
        this.url = url;
        this.ephemeralSecret = ephemeralSecret;
        this.handlers = handlers;
        this.factory = factory ?? ((socketUrl, protocols) => new WebSocket(socketUrl, protocols));
    }
    connect() {
        if (this.socket)
            return Promise.reject(new Error("Realtime socket already created"));
        if (!this.url.startsWith("wss://") || !this.ephemeralSecret || this.ephemeralSecret.length > 4096) {
            return Promise.reject(new Error("Invalid realtime connection configuration"));
        }
        return new Promise((resolve, reject) => {
            let settled = false;
            const timeout = setTimeout(() => {
                if (settled)
                    return;
                settled = true;
                this.close();
                reject(new Error("Realtime session did not become ready"));
            }, 15_000);
            const finish = (error) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timeout);
                if (error)
                    reject(error);
                else
                    resolve();
            };
            try {
                this.socket = this.factory(this.url, [
                    "realtime",
                    "openai-insecure-api-key." + this.ephemeralSecret,
                ]);
            }
            catch {
                finish(new Error("Realtime connection could not be created"));
                return;
            }
            const socket = this.socket;
            socket.onopen = () => undefined;
            socket.onmessage = (message) => {
                if (typeof message.data !== "string")
                    return;
                let event;
                try {
                    const parsed = JSON.parse(message.data);
                    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                        return;
                    event = parsed;
                }
                catch {
                    return;
                }
                if (event.type === "session.created" || event.type === "session.updated") {
                    if (!this.ready) {
                        this.ready = true;
                        finish();
                        this.handlers.onReady?.();
                    }
                    return;
                }
                if (event.type === "input_audio_buffer.committed") {
                    if (this.pendingCommitCount > 0)
                        this.pendingCommitCount -= 1;
                    if (typeof event.item_id === "string") {
                        this.pendingTranscriptItemIds.add(event.item_id);
                        this.pendingTranscriptOrder.push(event.item_id);
                        this.flushOrderedTranscripts();
                    }
                    this.finishFlushIfIdle();
                    return;
                }
                if (event.type === "conversation.item.input_audio_transcription.failed") {
                    if (typeof event.item_id === "string") {
                        this.failedTranscriptItemIds.add(event.item_id);
                        this.pendingTranscriptItemIds.delete(event.item_id);
                        this.flushOrderedTranscripts();
                    }
                    this.handlers.onError?.("Realtime transcription failed");
                    this.finishFlushIfIdle();
                    return;
                }
                if (event.type === "error") {
                    const error = event.error;
                    const messageText = error && typeof error === "object" &&
                        typeof error.message === "string"
                        ? error.message
                        : "Realtime transcription provider error";
                    this.handlers.onError?.(messageText.slice(0, 240));
                    return;
                }
                const transcript = parseRealtimeTranscriptionEvent(message.data);
                if (transcript) {
                    if (transcript.stage === "partial") {
                        this.handlers.onTranscript?.(transcript);
                    }
                    else if (transcript.itemId) {
                        // The provider does not guarantee that completed events for
                        // separate turns arrive in commit order. Buffer finals until all
                        // earlier committed items have completed.
                        this.completedTranscripts.set(transcript.itemId, transcript);
                        this.flushOrderedTranscripts();
                    }
                    else {
                        this.handlers.onTranscript?.(transcript);
                    }
                }
            };
            socket.onerror = () => {
                const error = new Error("Realtime connection failed");
                finish(error);
                this.handlers.onError?.(error.message);
            };
            socket.onclose = () => {
                this.pendingFlushResolver?.();
                this.ready = false;
                finish(new Error("Realtime connection closed before it was ready"));
                this.handlers.onClose?.();
            };
        });
    }
    appendAudio(buffer) {
        const socket = this.socket;
        if (!this.ready || !socket || socket.readyState !== SOCKET_OPEN) {
            throw new Error("Realtime session is not ready");
        }
        if (buffer.byteLength === 0)
            return;
        socket.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: encodePcm16Base64(buffer),
        }));
    }
    commitAudio() {
        const socket = this.socket;
        if (!this.ready || !socket || socket.readyState !== SOCKET_OPEN) {
            throw new Error("Realtime session is not ready");
        }
        this.pendingCommitCount += 1;
        try {
            socket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
        }
        catch (error) {
            this.pendingCommitCount = Math.max(0, this.pendingCommitCount - 1);
            throw error;
        }
    }
    flushOrderedTranscripts() {
        while (this.pendingTranscriptOrder.length > 0) {
            const itemId = this.pendingTranscriptOrder[0];
            const transcript = this.completedTranscripts.get(itemId);
            const failed = this.failedTranscriptItemIds.has(itemId);
            if (!transcript && !failed)
                break;
            this.pendingTranscriptOrder.shift();
            this.pendingTranscriptItemIds.delete(itemId);
            this.completedTranscripts.delete(itemId);
            this.failedTranscriptItemIds.delete(itemId);
            if (transcript)
                this.handlers.onTranscript?.(transcript);
        }
        this.finishFlushIfIdle();
    }
    finishFlushIfIdle() {
        if (this.pendingCommitCount === 0 && this.pendingTranscriptItemIds.size === 0) {
            this.pendingFlushResolver?.();
        }
    }
    async flushAndClose(timeoutMs = 2_000, commitPendingAudio = true) {
        if (!this.socket || !this.ready) {
            this.close();
            return;
        }
        // A previous silence-detected turn may still be awaiting its transcript
        // even when there is no new audio to commit at stop time.
        if (!commitPendingAudio && this.pendingCommitCount === 0 && this.pendingTranscriptItemIds.size === 0) {
            this.close();
            return;
        }
        // Register before commitAudio(): a fast provider/test socket can return
        // the commit acknowledgement and final transcript during send().
        const flushResult = new Promise((resolve) => {
            let settled = false;
            let timeout;
            const finish = () => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timeout);
                if (this.pendingFlushResolver === finish)
                    this.pendingFlushResolver = null;
                resolve();
            };
            timeout = setTimeout(finish, Math.max(0, timeoutMs));
            this.pendingFlushResolver = finish;
        });
        if (commitPendingAudio) {
            try {
                this.commitAudio();
            }
            catch {
                this.pendingFlushResolver?.();
                this.close();
                return;
            }
        }
        this.finishFlushIfIdle();
        await flushResult;
        this.close();
    }
    close() {
        this.pendingFlushResolver?.();
        this.pendingFlushResolver = null;
        const socket = this.socket;
        this.ready = false;
        this.socket = null;
        this.pendingCommitCount = 0;
        this.pendingTranscriptItemIds.clear();
        this.pendingTranscriptOrder.length = 0;
        this.completedTranscripts.clear();
        this.failedTranscriptItemIds.clear();
        if (socket && socket.readyState < 2)
            socket.close(1000, "User stopped interpretation");
    }
}
