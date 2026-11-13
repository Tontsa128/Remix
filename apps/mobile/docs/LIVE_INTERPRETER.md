# Elovio Live interpreter — shared implementation

## Product behavior

- User explicitly starts and stops microphone use.
- Conversation history remains off by default; raw audio and transcripts are not retained by the app.
- Both face-to-face phone use and headphone use are product goals. The current code does not yet provide reliable Bluetooth/earpiece routing.
- Text, audio or both are selectable output modes.
- Finnish, Spanish and English are the initial language set. Only these three codes are currently accepted by the provider routes.

## Shared service architecture

Both clients call the same TanStack Start routes:

- `POST /api/ai/translate` — authenticated AI Gateway translation.
- `GET /api/ai/voices?language=fi|es|en` — supported AI Gateway voice options (four configured prebuilt voices; not a dynamic provider catalogue).
- `POST /api/ai/synthesize` — authenticated speech synthesis through AI Gateway.
- `POST /api/ai/transcribe` — turn-based WAV transcription through AI Gateway, used by the browser interpreter.
- `POST /api/ai/transcription-session` — authenticated, short-lived OpenAI Realtime session creation used by the native Expo interpreter.
- `POST /api/ai/understand` — text or image explanation/translation through AI Gateway.

Supabase validates the user's bearer token and enforces per-user quotas through `public.elovio_consume_usage(text)`. The migration must be applied to the same Supabase project used by both clients.

## Native Expo flow

1. The user accepts the audio disclosure and starts listening.
2. Expo requests microphone permission and captures foreground audio.
3. The app asks the Elovio API for a short-lived OpenAI Realtime client credential. The long-lived `OPENAI_API_KEY` never reaches the device.
4. PCM16 mono 24 kHz audio is streamed over a secure WebSocket.
5. Final transcripts are routed only when the detected language matches one of the two selected conversation languages.
6. The app sends the text to the shared translation route.
7. If audio output is selected, the app requests the exact selected voice option and plays the returned audio. Microphone capture pauses during playback.

## Browser flow

The browser import uses a turn-based audio adapter: it captures one speech turn, sends bounded WAV data to `/api/ai/transcribe`, then translates the resulting text. It is not a full-duplex stream.

## Limitations that must not be advertised as complete

- Native realtime interpretation is sequential turn-taking, not simultaneous full-duplex conversation.
- Speaker diarization is not implemented; the app cannot reliably identify two speakers from one microphone.
- Bluetooth/earpiece routing, acoustic echo cancellation, robust barge-in and background microphone service are not implemented.
- The current voice options are configured prebuilt voice IDs, not a live provider-discovered catalogue.
- Camera/OCR for the native Understand screen is not implemented.
- No physical Android or iOS end-to-end test has been completed.
- Live API use requires server environment configuration, an applied Supabase migration and a valid user session.

## Privacy

- No microphone permission is requested before the user starts.
- No audio recording or transcript history is persisted by Elovio.
- OpenAI receives audio for recognition; recognized text and optional speech synthesis requests pass through the Elovio API Gateway.
- Keep provider secrets server-only. Do not embed them in Expo public variables or native assets.
- Interpretation can be wrong. Confirm critical medical, legal, financial and booking details with the other speaker.
