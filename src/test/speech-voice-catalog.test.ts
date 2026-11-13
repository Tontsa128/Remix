import { describe, expect, it } from "vitest";
import { ELOVIO_SPEECH_VOICES, resolveElovioSpeechVoice, serializeElovioSpeechVoices } from "../lib/elovio-provider/speech-voice-catalog";

describe("Elovio speech voice catalogue", () => {
  it("contains unique exact IDs and explicit genders", () => {
    expect(new Set(ELOVIO_SPEECH_VOICES.map((voice) => voice.name)).size).toBe(ELOVIO_SPEECH_VOICES.length);
    for (const voice of ELOVIO_SPEECH_VOICES) {
      expect(voice.name.trim()).not.toBe("");
      expect(["FEMALE", "MALE"]).toContain(voice.gender);
      expect(resolveElovioSpeechVoice(voice.name, voice.gender)?.name).toBe(voice.name);
    }
  });

  it("serializes the language and gender fields required by the native parser", () => {
    const voices = serializeElovioSpeechVoices("fi-FI");
    expect(voices).toHaveLength(ELOVIO_SPEECH_VOICES.length);
    for (const voice of voices) {
      expect(voice.languageCode).toBe("fi-FI");
      expect(voice.languageCodes).toEqual(["fi-FI"]);
      expect(voice.ssmlGender).toBe(voice.gender);
      expect(voice.naturalSampleRateHertz).toBe(24000);
    }
  });

  it("never silently substitutes an unknown ID or a different gender", () => {
    expect(resolveElovioSpeechVoice("not-a-real-voice", "FEMALE")).toBeNull();
    expect(resolveElovioSpeechVoice("Aoede", "MALE")).toBeNull();
    expect(resolveElovioSpeechVoice("Charon", "FEMALE")).toBeNull();
  });
});
