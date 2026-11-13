import assert from "node:assert/strict";
import test from "node:test";
import { loadLocalSpeechPreferences, saveLocalSpeechPreferences, type SpeechPreferences } from "../src/services/speech-preferences";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test("persists separate real voice IDs and gender preferences for each language", () => {
  const storage = createStorage();
  const preferences: SpeechPreferences = {
    fi: { gender: "FEMALE", voiceName: "fi-FI-Chirp3-HD-Aoede" },
    es: { gender: "MALE", voiceName: "es-ES-Chirp3-HD-Orus" },
  };
  assert.equal(saveLocalSpeechPreferences(preferences, storage), true);
  assert.deepEqual(loadLocalSpeechPreferences(storage), preferences);
});

test("ignores malformed or unsupported stored voice preferences", () => {
  const storage = createStorage();
  storage.setItem("elovio.speech-preferences.v1", JSON.stringify({
    fi: { gender: "FEMALE", voiceName: "fi-FI-Chirp3-HD-Aoede" },
    de: { gender: "MALE", voiceName: "de-DE-Voice-A" },
    en: { gender: "NEUTRAL", voiceName: "en-US-Voice-A" },
    es: { gender: "MALE", voiceName: "bad voice name" },
  }));
  assert.deepEqual(loadLocalSpeechPreferences(storage), {
    fi: { gender: "FEMALE", voiceName: "fi-FI-Chirp3-HD-Aoede" },
  });
});

test("handles unavailable and corrupted local storage safely", () => {
  const storage = createStorage();
  storage.setItem("elovio.speech-preferences.v1", "{broken");
  assert.deepEqual(loadLocalSpeechPreferences(storage), {});
  const failing = { getItem: () => { throw new Error("unavailable"); }, setItem: () => { throw new Error("unavailable"); } };
  assert.deepEqual(loadLocalSpeechPreferences(failing), {});
  assert.equal(saveLocalSpeechPreferences({ fi: { gender: "MALE", voiceName: "fi-FI-Chirp3-HD-Charon" } }, failing), false);
});
