import {
  parseSpeechVoices,
  SPEECH_LANGUAGES,
  type SpeechLanguage,
  type SpeechVoice,
  type SynthesisRequest,
} from "./speech-validation";

export class SpeechProviderError extends Error {
  constructor() {
    super("Speech provider request failed");
    this.name = "SpeechProviderError";
  }
}

export interface SpeechProvider {
  listVoices(language: SpeechLanguage): Promise<SpeechVoice[]>;
  synthesize(input: SynthesisRequest): Promise<{ audioContent: string; voice: SpeechVoice }>;
}

export function createGoogleSpeechProvider(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): SpeechProvider {
  async function listVoices(language: SpeechLanguage): Promise<SpeechVoice[]> {
    try {
      const languageCode = SPEECH_LANGUAGES[language];
      const url = new URL("https://texttospeech.googleapis.com/v1/voices");
      url.searchParams.set("languageCode", languageCode);
      url.searchParams.set("key", apiKey);
      const response = await fetcher(url.toString(), { signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new SpeechProviderError();
      const voices = parseSpeechVoices(await response.json(), languageCode);
      if (!voices?.length) throw new SpeechProviderError();
      return voices;
    } catch {
      throw new SpeechProviderError();
    }
  }

  return {
    listVoices,
    async synthesize(input) {
      try {
        const voices = await listVoices(input.language);
        const voice = voices.find((item) => item.name === input.voiceName && item.gender === input.gender);
        if (!voice) throw new SpeechProviderError();
        const url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(apiKey);
        const response = await fetcher(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: input.text },
            voice: { languageCode: voice.languageCode, name: voice.name },
            audioConfig: { audioEncoding: "MP3" },
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new SpeechProviderError();
        const payload = await response.json() as { audioContent?: unknown };
        if (typeof payload.audioContent !== "string" ||
            payload.audioContent.length < 100 ||
            payload.audioContent.length > 4_000_000 ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.audioContent)) throw new SpeechProviderError();
        return { audioContent: payload.audioContent, voice };
      } catch {
        throw new SpeechProviderError();
      }
    },
  };
}
