import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleSpeechProvider, SpeechProviderError } from "../../src/lib/elovio-provider/speech-provider";
const voicePayload = { voices: [
        { name: "fi-FI-Chirp3-HD-Aoede", languageCodes: ["fi-FI"], ssmlGender: "FEMALE", naturalSampleRateHertz: 24000 },
        { name: "fi-FI-Chirp3-HD-Charon", languageCodes: ["fi-FI"], ssmlGender: "MALE", naturalSampleRateHertz: 24000 },
    ] };
test("lists exact locale voices from Google's live voice catalogue adapter", async () => {
    let url = "";
    const provider = createGoogleSpeechProvider("server-secret", async (requestUrl) => {
        url = String(requestUrl);
        return new Response(JSON.stringify(voicePayload), { status: 200 });
    });
    const voices = await provider.listVoices("fi");
    assert.match(url, /languageCode=fi-FI/);
    assert.match(url, /key=server-secret/);
    assert.deepEqual(voices.map((item) => item.gender), ["FEMALE", "MALE"]);
});
test("synthesizes only with an exact provider voice and explicit MP3 output", async () => {
    const calls = [];
    const provider = createGoogleSpeechProvider("secret", async (requestUrl, init) => {
        const url = String(requestUrl);
        if (url.includes("/v1/voices?"))
            return new Response(JSON.stringify(voicePayload), { status: 200 });
        calls.push({ url, body: JSON.parse(String(init?.body)) });
        return new Response(JSON.stringify({ audioContent: "A".repeat(200) }), { status: 200 });
    });
    const result = await provider.synthesize({ text: "Hei, mitä kuuluu?", language: "fi", voiceName: "fi-FI-Chirp3-HD-Aoede", gender: "FEMALE" });
    assert.equal(result.voice.name, "fi-FI-Chirp3-HD-Aoede");
    assert.deepEqual(calls[0].body, {
        input: { text: "Hei, mitä kuuluu?" },
        voice: { languageCode: "fi-FI", name: "fi-FI-Chirp3-HD-Aoede" },
        audioConfig: { audioEncoding: "MP3" },
    });
});
test("does not silently substitute a different requested voice gender", async () => {
    const provider = createGoogleSpeechProvider("secret", async () => new Response(JSON.stringify(voicePayload), { status: 200 }));
    await assert.rejects(provider.synthesize({ text: "Hei", language: "fi", voiceName: "fi-FI-Chirp3-HD-Aoede", gender: "MALE" }), SpeechProviderError);
});
test("normalizes Google API failures", async () => {
    const provider = createGoogleSpeechProvider("secret", async () => new Response("private provider error", { status: 403 }));
    await assert.rejects(provider.listVoices("fi"), SpeechProviderError);
});
