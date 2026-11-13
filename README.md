# Elovio — one multilingual language platform, web + mobile

Elovio is a commercial, international AI language platform. The same product is delivered as a responsive browser app and as native Android/iOS apps. Finnish, Spanish and English are the initial languages; interface, native/explanation, learning and interpretation languages remain independent.

## Monorepo layout

- `/`: TanStack Start web application, shared web API routes and server-side AI gateway integration.
- `apps/mobile/`: Expo SDK 58 / React Native 0.88 app, native audio, SQLite persistence, EAS profiles and mobile learning tests.
- `supabase/migrations/`: shared database schema, row-level security and atomic API usage quotas for both clients.

The web and mobile apps use the same Supabase project and the same API origin. Native builds set `EXPO_PUBLIC_API_BASE_URL` to the deployed web/API origin. The server requires a private `LOVABLE_API_KEY` for AI Gateway calls and `OPENAI_API_KEY` for native realtime transcription; both remain server-side.

## Development

Web (Bun lockfile):
```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun run test
bun run typecheck
bun run build
```

Mobile:
```sh
cd apps/mobile
npm ci
npm start
npm test
npm run typecheck
npm run doctor
```

## Web application architecture

The web app uses TanStack Start with a modular client UI (`src/ElovioApp.tsx`, `src/screens/`, `src/components/`, `src/services/`, `src/data/`):

- **Koti** (`HomeScreen.tsx`): daily goal progress, 7-day activity tracker, dynamic learner level, primary "Jatka harjoitusta" CTA, and shortcuts to Tulkki and Opettaja.
- **Harjoitukset** (`ExercisesScreen.tsx`, `ExercisePlayerScreen.tsx`): 9 everyday situations with 10 sentences each (90 total), multiple choice, listening, fuzzy typing, pair matching, and 1/3/7-day spaced-repetition review queue stored in `localStorage`.
- **Tulkki** (`InterpreterScreen.tsx`):
  - **Teksti & Puhe**: text translation (`POST /api/translate` with `gemini-3.8-flash`), quick phrases, dictation, and `speechSynthesis` playback.
  - **Live-ääni**: real-time speech-to-speech translation (`gemini-3.5-live-translate-preview`) via dual ephemeral-token sessions (`GET /api/live-token`) with AudioWorklet 16 kHz PCM16 capture, 24 kHz queued playback, speaker echo-muting, and a daily usage cap (`15 min/day`).
- **Opettaja** (`TutorScreen.tsx`): AI tutor chat + waiter/pharmacist roleplay and a "Selitä" tab for text/image explanations (`POST /api/tutor` with `gemini-3.8-flash`).

## Permissions & environment variables

- **Microphone permissions**: `metadata.json` declares `"permissions": ["microphone"]` and `"requestFramePermissions": ["microphone"]`. Microphone access (`src/services/mic.ts`) is requested strictly on explicit user interaction with `echoCancellation` and `noiseSuppression` enabled, clear Finnish guidance for `NotAllowedError` / `NotFoundError` / `NotReadableError`, and no retry button when browser permissions are `denied`.
- **Server-side Gemini API key**: Set `GEMINI_API_KEY` on the server environment (see `.env.example`). Never expose `GEMINI_API_KEY` to browser code; Live API browser sessions use short-lived single-use ephemeral tokens minted by `/api/live-token`.
- **Supabase (optional cloud auth)**: Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` if using remote Supabase auth. Learning flows and local progress work seamlessly via `localStorage` without cloud configuration.

## Product truth and release gates

Learning flows, local progress, and spaced-repetition reviews work locally in the browser without a configured cloud account. Server-side AI translation, live speech-to-speech translation, and AI tutor/image explanations require `GEMINI_API_KEY` to be configured on the server. No public store release is made by CI.

