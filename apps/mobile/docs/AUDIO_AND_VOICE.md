# Elovio — Audio and voice product requirements

Status: product and engineering requirements only. Audio playback, recording, ASR, TTS, and pronunciation assessment are not implemented by this document.

## User-facing voice choice

- Users can select a **male voice** or a **female voice** for synthetic speech.
- The selection is a speech-output preference, not a statement about the user's own gender.
- Keep voice preference independent from interface language, explanation/native language, learning language, and interpretation source/target languages.
- Persist the choice in the user's account when authenticated and in device-local settings before sign-in; define conflict resolution when account sync is implemented.
- Apply the preference to listening exercises, AI tutor speech, and the spoken output of live interpretation wherever the selected speech provider supports the requested voice.
- Provide a short, real voice preview before the user confirms a voice. Do not use fabricated preview audio.
- Show only voices actually available for the chosen language and provider. If a language has no matching male or female voice, explain that limitation and ask the user to choose an available voice; never silently substitute a different voice.
- Voice availability must be represented by provider capability metadata, not hard-coded assumptions about all languages.

## Technical design constraints

- Implement TTS behind a provider-independent adapter. Keep provider credentials and privileged API calls on the server.
- Model a voice as provider voice ID plus language/locale and supported voice characteristics. Do not rely on a display label alone.
- Resolve voice selection against the chosen language and provider at request time; validate unsupported combinations before synthesis.
- Keep voice identity separate from ASR input settings and from the user's microphone.
- Support interruption and immediate stop for spoken output. Respect Android audio focus and Bluetooth routing; validate iOS behavior separately.
- Do not record or retain user speech by default. Any recording, transcription retention, or use for model improvement requires clear purpose, explicit consent, retention period, and deletion path.
- Measure synthesis latency, playback failures, language coverage, and cost using real provider responses. Do not report fabricated usage or quality metrics.

## Acceptance criteria

1. The user can select male or female speech output in a dedicated voice setting.
2. The setting survives app restart and, after account sync is implemented, sign-in on another device.
3. The selected voice is used in a real preview and real listening exercise for each supported language/locale.
4. Unsupported voice/language combinations are clearly disclosed; no silent gender substitution occurs.
5. Automated tests cover preference validation, persistence/migration, provider capability matching, and fallback/error handling.
6. Physical-device tests verify playback, stop behavior, audio focus, Bluetooth routing where supported, and accessibility.
7. Documentation states exactly which languages/providers offer which voices.

## Implementation sequence

1. Evaluate providers for Finnish, Spanish (Spain), and English voice coverage, voice quality, licensing, latency, privacy, and cost.
2. Add typed voice preference and provider capability contracts.
3. Implement server-side TTS adapter and real voice preview.
4. Add listening exercise playback and comprehension flow using reviewed, licensed audio/content.
5. Add live interpretation speech output and platform-specific audio handling.
