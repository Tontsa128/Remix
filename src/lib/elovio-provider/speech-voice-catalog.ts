export type ElovioVoiceGender = "FEMALE" | "MALE";

export type ElovioSpeechVoice = {
  name: string;
  gender: ElovioVoiceGender;
};

export const ELOVIO_SPEECH_VOICES: readonly ElovioSpeechVoice[] = [
  { name: "Aoede", gender: "FEMALE" },
  { name: "Charon", gender: "MALE" },
  { name: "Kore", gender: "FEMALE" },
  { name: "Puck", gender: "MALE" },
] as const;

/** Return only the exact configured voice when both its ID and requested gender match. */
export function resolveElovioSpeechVoice(
  voiceName: string,
  gender: ElovioVoiceGender,
): ElovioSpeechVoice | null {
  const voice = ELOVIO_SPEECH_VOICES.find((item) => item.name === voiceName);
  return voice?.gender === gender ? voice : null;
}

export function serializeElovioSpeechVoices(languageCode: string) {
  return ELOVIO_SPEECH_VOICES.map((voice) => ({
    name: voice.name,
    gender: voice.gender,
    ssmlGender: voice.gender,
    languageCode,
    languageCodes: [languageCode],
    naturalSampleRateHertz: 24_000,
  }));
}
