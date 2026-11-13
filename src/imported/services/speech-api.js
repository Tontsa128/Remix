import { requestElovioApi } from './api-client';
export class SpeechApiError extends Error {
    code;
    constructor(code) {
        super("Speech service request failed");
        this.code = code;
        this.name = "SpeechApiError";
    }
}
function endpoint(path, baseUrl, isWeb) {
    const base = baseUrl.trim().replace(/\/$/, "");
    if (base)
        return base + path;
    if (isWeb)
        return path;
    throw new SpeechApiError("server_missing");
}
function parseVoices(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.voices)) {
        throw new SpeechApiError("invalid_response");
    }
    return (value.voices).filter((item) => {
        if (!item || typeof item !== "object")
            return false;
        const voice = item;
        return typeof voice.name === "string" &&
            (voice.gender === "FEMALE" || voice.gender === "MALE") &&
            typeof voice.languageCode === "string" &&
            typeof voice.naturalSampleRateHertz === "number";
    });
}
export async function fetchSpeechVoices(language, accessToken, baseUrl = import.meta.env.VITE_ELOVIO_API_BASE_URL ?? "", fetcher = requestElovioApi, isWeb = typeof window !== "undefined") {
    try {
        const url = endpoint("/api/ai/voices?language=" + encodeURIComponent(language), baseUrl, isWeb);
        const response = await fetcher(url, { headers: { Authorization: "Bearer " + accessToken } });
        const payload = await response.json();
        if (!response.ok)
            throw new SpeechApiError(payload?.error ?? "request_failed");
        const voices = parseVoices(payload);
        return voices;
    }
    catch (error) {
        if (error instanceof SpeechApiError)
            throw error;
        throw new SpeechApiError("request_failed");
    }
}
export async function synthesizeSpeech(text, language, voiceName, gender, accessToken, baseUrl = import.meta.env.VITE_ELOVIO_API_BASE_URL ?? "", fetcher = requestElovioApi, isWeb = typeof window !== "undefined") {
    try {
        const url = endpoint("/api/ai/synthesize", baseUrl, isWeb);
        const response = await fetcher(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
            body: JSON.stringify({ text, language, voiceName, gender }),
        });
        const payload = await response.json();
        if (!response.ok)
            throw new SpeechApiError(payload.error ?? "request_failed");
        if (typeof payload.audioContent !== "string" ||
            payload.audioContent.length < 100 ||
            payload.audioContent.length > 4_000_000 ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.audioContent)) {
            throw new SpeechApiError("invalid_response");
        }
        return payload.audioContent;
    }
    catch (error) {
        if (error instanceof SpeechApiError)
            throw error;
        throw new SpeechApiError("request_failed");
    }
}
