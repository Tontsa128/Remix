import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleTranslationProvider, TranslationProviderError } from "../../src/lib/elovio-provider/translation-provider";
test("Google adapter sends bounded text and language selection with its key server-side", async () => {
    let url = "";
    let body = {};
    const provider = createGoogleTranslationProvider("server-secret", async (requestUrl, init) => {
        url = String(requestUrl);
        body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ data: { translations: [{ translatedText: "Missä vastaanotto on?", detectedSourceLanguage: "es" }] } }), { status: 200 });
    });
    const result = await provider.translate({ text: "¿Dónde está la recepción?", sourceLanguage: "auto", targetLanguage: "fi" });
    assert.match(url, /translation\.googleapis\.com\/language\/translate\/v2/);
    assert.match(url, /key=server-secret/);
    assert.deepEqual(body, { q: "¿Dónde está la recepción?", target: "fi", format: "text" });
    assert.deepEqual(result, { translatedText: "Missä vastaanotto on?", detectedSourceLanguage: "es" });
});
test("Google adapter includes an explicit source language when selected", async () => {
    let body = {};
    const provider = createGoogleTranslationProvider("secret", async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ data: { translations: [{ translatedText: "Hello", detectedSourceLanguage: "fi" }] } }), { status: 200 });
    });
    await provider.translate({ text: "Hei", sourceLanguage: "fi", targetLanguage: "en" });
    assert.equal(body.source, "fi");
    assert.equal(body.target, "en");
});
test("Google adapter uses the validated explicit source when Google omits detectedSourceLanguage", async () => {
    const provider = createGoogleTranslationProvider("secret", async () => new Response(JSON.stringify({ data: { translations: [{ translatedText: "Hello" }] } }), { status: 200 }));
    const result = await provider.translate({ text: "Hei", sourceLanguage: "fi", targetLanguage: "en" });
    assert.deepEqual(result, { translatedText: "Hello", detectedSourceLanguage: "fi" });
});
test("Google adapter hides provider failures and malformed responses", async () => {
    const failed = createGoogleTranslationProvider("secret", async () => new Response("provider internals", { status: 500 }));
    await assert.rejects(failed.translate({ text: "hola", sourceLanguage: "es", targetLanguage: "fi" }), TranslationProviderError);
    const malformed = createGoogleTranslationProvider("secret", async () => new Response(JSON.stringify({ data: { translations: [{}] } }), { status: 200 }));
    await assert.rejects(malformed.translate({ text: "hola", sourceLanguage: "es", targetLanguage: "fi" }), TranslationProviderError);
});
