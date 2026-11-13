import { requestElovioApi } from './api-client';
export class RealtimeTranscriptionApiError extends Error {
    code;
    constructor(code) {
        super("Realtime transcription session request failed");
        this.code = code;
        this.name = "RealtimeTranscriptionApiError";
    }
}
function resolveEndpoint(baseUrl, isWeb) {
    const base = baseUrl.trim().replace(/\/$/, "");
    if (base)
        return base + "/api/ai/transcription-session";
    if (isWeb)
        return "/api/ai/transcription-session";
    throw new RealtimeTranscriptionApiError("server_missing");
}
function parseSession(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new RealtimeTranscriptionApiError("invalid_response");
    }
    const session = value;
    const audio = session.audio;
    if (typeof session.clientSecret !== "string" ||
        session.clientSecret.length < 16 ||
        session.clientSecret.length > 4096 ||
        typeof session.expiresAt !== "number" ||
        !Number.isSafeInteger(session.expiresAt) ||
        session.expiresAt <= Math.floor(Date.now() / 1000) ||
        typeof session.websocketUrl !== "string" ||
        !session.websocketUrl.startsWith("wss://") ||
        !audio || typeof audio !== "object" ||
        audio.format !== "pcm16" ||
        audio.sampleRate !== 24_000 ||
        audio.channels !== 1 ||
        !Array.isArray(session.languageHints) ||
        !session.languageHints.every((item) => item === "fi" || item === "es" || item === "en")) {
        throw new RealtimeTranscriptionApiError("invalid_response");
    }
    return session;
}
export async function createRealtimeTranscriptionSession(accessToken, baseUrl = import.meta.env.VITE_ELOVIO_API_BASE_URL ?? "", fetcher = requestElovioApi, isWeb = typeof window !== "undefined") {
    if (!accessToken || accessToken.length > 8192) {
        throw new RealtimeTranscriptionApiError("authentication_required");
    }
    try {
        const response = await fetcher(resolveEndpoint(baseUrl, isWeb), {
            method: "POST",
            headers: { Authorization: "Bearer " + accessToken },
        });
        const payload = await response.json();
        if (!response.ok) {
            const code = payload && typeof payload === "object" &&
                typeof payload.error === "string"
                ? payload.error
                : "request_failed";
            throw new RealtimeTranscriptionApiError(code);
        }
        return parseSession(payload);
    }
    catch (error) {
        if (error instanceof RealtimeTranscriptionApiError)
            throw error;
        throw new RealtimeTranscriptionApiError("request_failed");
    }
}
