import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { generateResponse, generateSpeech, transcribeAudio, GatewayError } from '@lovable.dev/ai-gateway';
import type { Database } from '@/integrations/supabase/types';
import { parseTutorRequest, parseTutorStructuredResponse } from './elovio-provider/tutor-validation';
import { buildTutorSystemInstruction } from './elovio-provider/tutor-prompt';
import { parseTranslationRequest, parseTranslationResult } from './elovio-provider/translation-validation';
import { parseSynthesisRequest, SPEECH_LANGUAGES } from './elovio-provider/speech-validation';
import { resolveElovioSpeechVoice, serializeElovioSpeechVoices } from './elovio-provider/speech-voice-catalog';
import { isElovioApiOriginAllowed } from './elovio-provider/api-origin';

const CHAT_MODEL = 'openai/gpt-6-astra' as const;
const SPEECH_MODEL = 'google/gemini-3.1-flash-tts-preview' as const;
const TRANSCRIPTION_MODEL = 'openai/gpt-transcribe' as const;

const languageSchema = z.enum(['fi', 'es', 'en']);
const understandSchema = z.object({
  text: z.string().trim().max(4000),
  // 2 MB file ≈ 2.8 MB base64 incl. data-URL header; keep UI and server limits aligned.
  image: z.string().max(2_900_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/).optional(),
  language: languageSchema,
}).refine((input) => input.text.length > 0 || Boolean(input.image));
const transcribeSchema = z.object({
  audio: z.string().max(4_000_000).regex(/^data:audio\/wav;base64,[A-Za-z0-9+/]+=*$/),
});

function extractText(response: unknown): string {
  const r = response as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (typeof r.output_text === 'string' && r.output_text.trim()) return r.output_text;
  const parts = r.output?.flatMap((item) => item.content ?? []) ?? [];
  return parts.filter((p) => p.type === 'output_text' && typeof p.text === 'string').map((p) => p.text!).join('');
}

async function chatJson(instructions: string, userText: string, imageDataUrl?: string): Promise<unknown> {
  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: `${userText}\n\nReturn JSON.` }];
  if (imageDataUrl) content.push({ type: 'input_image', image_url: imageDataUrl });
  const response = await generateResponse({
    model: CHAT_MODEL,
    instructions,
    input: [{ role: 'user', content: content as never }],
    text: { format: { type: 'json_object' } },
  } as never);
  const text = extractText(response);
  return JSON.parse(text);
}

function isAllowedApiOrigin(request: Request): boolean {
  const allowlist = (process.env['APP_ALLOWED_ORIGINS'] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  return isElovioApiOriginAllowed(request.headers.get('origin'), new URL(request.url).origin, allowlist);
}

function apiResponseHeaders(request: Request): Headers {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  });
  const origin = request.headers.get('origin');
  if (origin && isAllowedApiOrigin(request)) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

export async function handleElovioHttp(request: Request, action: string): Promise<Response> {
  if (!isAllowedApiOrigin(request)) {
    return Response.json({ error: 'origin_not_allowed' }, { status: 403 });
  }
  const headers = apiResponseHeaders(request);
  if (request.method === 'OPTIONS') {
    if (!request.headers.get('origin')) return Response.json({ error: 'origin_not_allowed' }, { status: 403 });
    return new Response(null, { status: 204, headers });
  }
  let body: unknown;
  try { body = await request.json(); } catch { body = undefined; }
  const language = new URL(request.url).searchParams.get('language') ?? undefined;
  const { status, payload } = await runElovioApi(request, action, body, language);
  return Response.json(payload, { status, headers });
}

export async function runElovioApi(request: Request, action: string, body?: unknown, language?: string) {
  const result = (status: number, payload: Record<string, unknown>) => ({ status, payload });
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!token || !url || !key) return result(401, { error: 'authentication_required' });
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return result(401, { error: 'invalid_session' });
  if (JSON.stringify(body ?? {}).length > 4_100_000) return result(413, { error: 'request_too_large' });
  const consume = async (capability: 'tutor' | 'translation' | 'speech' | 'asr') => {
    const { data, error } = await supabase.rpc('elovio_consume_usage', { p_capability: capability });
    return error ? result(503, { error: 'usage_limit_unavailable' }) : data !== true ? result(429, { error: 'rate_limit_exceeded' }) : null;
  };
  try {
    if (action === 'tutor') {
      const input = parseTutorRequest(body);
      if (!input) return result(400, { error: 'invalid_request' });
      const quota = await consume('tutor');
      if (quota) return quota;
      const history = input.messages.map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`).join('\n');
      const raw = await chatJson(buildTutorSystemInstruction(input), `Conversation so far:\n${history}`);
      const response = parseTutorStructuredResponse(raw);
      if (!response) return result(502, { error: 'invalid_ai_response' });
      const reply = [response.message,
        response.targetExample ? `${response.targetExample}${response.translation ? ` — ${response.translation}` : ''}` : '',
        response.correction ? `${response.correction.original} → ${response.correction.corrected} — ${response.correction.reason}` : '',
        response.nextPrompt].filter(Boolean).join('\n\n');
      return result(200, { reply, confidence: response.confidence, needsClarification: response.needsClarification, visualVocabularyId: response.visualVocabularyId, model: CHAT_MODEL });
    }
    if (action === 'translate') {
      const input = parseTranslationRequest(body);
      if (!input) return result(400, { error: 'invalid_request' });
      const quota = await consume('translation');
      if (quota) return quota;
      const raw = await chatJson(
        `You are a precise translator. Translate the user's text to ${input.targetLanguage}. ` +
        `Reply only with JSON: {"translatedText": "...", "detectedSourceLanguage": "<fi|es|en>"}.`,
        input.text,
      ) as { translatedText?: unknown; detectedSourceLanguage?: unknown };
      const response = parseTranslationResult(
        { translatedText: raw.translatedText, detectedSourceLanguage: raw.detectedSourceLanguage ?? (input.sourceLanguage === 'auto' ? undefined : input.sourceLanguage) },
        input.targetLanguage,
      );
      return response ? result(200, { ...response }) : result(502, { error: 'translation_result_invalid' });
    }
    if (action === 'voices') {
      const input = languageSchema.safeParse(language);
      if (!input.success) return result(400, { error: 'invalid_language' });
      return result(200, {
        language: input.data,
        voices: serializeElovioSpeechVoices(SPEECH_LANGUAGES[input.data]),
      });
    }
    if (action === 'synthesize') {
      const input = parseSynthesisRequest(body);
      if (!input) return result(400, { error: 'invalid_request' });
      const quota = await consume('speech');
      if (quota) return quota;
      // Preserve the exact saved voice selection. Never substitute a different ID or gender.
      const requested = resolveElovioSpeechVoice(input.voiceName, input.gender);
      if (!requested) return result(400, { error: 'voice_not_supported' });
      const audio = await generateSpeech({
        model: SPEECH_MODEL,
        contents: [{ role: 'user', parts: [{ text: input.text }] }],
        generationConfig: {
          speechConfig: {
            languageCode: SPEECH_LANGUAGES[input.language],
            voiceConfig: { prebuiltVoiceConfig: { voiceName: requested.name } },
          },
        },
      } as never);
      const buffer = Buffer.from(await (await audio.blob()).arrayBuffer());
      return result(200, { audioContent: buffer.toString('base64'), mimeType: audio.contentType || 'audio/mpeg', voice: { name: requested.name, gender: requested.gender } });
    }
    if (action === 'transcription-session') {
      const apiKey = process.env['OPENAI_API_KEY'];
      if (!apiKey) return result(503, { error: 'asr_provider_not_configured' });
      const quota = await consume('asr');
      if (quota) return quota;
      const { createOpenAIRealtimeTranscriptionProvider } = await import('./elovio-provider/realtime-transcription-provider');
      const session = await createOpenAIRealtimeTranscriptionProvider(apiKey).createSession();
      return result(200, {
        clientSecret: session.clientSecret,
        expiresAt: session.expiresAt,
        websocketUrl: 'wss://api.openai.com/v1/realtime?intent=transcription',
        audio: { format: 'pcm16', sampleRate: 24_000, channels: 1 },
        languageHints: ['fi', 'es', 'en'],
      });
    }
    if (action === 'transcribe') {
      const parsed = transcribeSchema.safeParse(body);
      if (!parsed.success) return result(400, { error: 'invalid_request' });
      const quota = await consume('asr');
      if (quota) return quota;
      const base64 = parsed.data.audio.split(',')[1]!;
      const wav = Buffer.from(base64, 'base64');
      if (wav.length < 1000) return result(400, { error: 'audio_too_short' });
      const transcription = await transcribeAudio({
        model: TRANSCRIPTION_MODEL,
        file: new Blob([new Uint8Array(wav)], { type: 'audio/wav' }),
        response_format: 'json',
      } as never);
      const t = transcription as { text?: string; language?: string };
      const detected = typeof t.language === 'string' ? t.language.toLowerCase().split('-')[0] : undefined;
      return result(200, {
        transcript: typeof t.text === 'string' ? t.text : '',
        detectedLanguage: detected === 'fi' || detected === 'es' || detected === 'en' ? detected : undefined,
      });
    }
    if (action === 'understand') {
      const parsed = understandSchema.safeParse(body);
      if (!parsed.success) return result(400, { error: 'invalid_request' });
      const quota = await consume('tutor');
      if (quota) return quota;
      const raw = await chatJson(
        `You are a language assistant. Explain and translate the user's text or image content into ${parsed.data.language}. ` +
        `Be concise and practical. Reply only with JSON: {"reply": "..."}.`,
        parsed.data.text || 'Explain the text in this image.',
        parsed.data.image,
      ) as { reply?: unknown };
      return typeof raw.reply === 'string' && raw.reply.trim()
        ? result(200, { reply: raw.reply })
        : result(502, { error: 'invalid_ai_response' });
    }
    return result(404, { error: 'unknown_action' });
  } catch (error) {
    if (error instanceof GatewayError) {
      console.error(`Elovio AI gateway error [${action}]:`, error.code, error.message);
      return result(502, { error: 'ai_provider_error' });
    }
    console.error(`Elovio API error [${action}]:`, error);
    return result(500, { error: 'internal_error' });
  }
}
