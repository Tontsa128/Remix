# Elovio — multilingual AI language platform

> **Elovio is the working product name.** The name and visual identity are replaceable and must not become hard-coded business or data identifiers.

Elovio is being developed as a commercial, international language platform for learning, real-world communication, and understanding everyday content. It is not limited to one source language or one target language.

**Current repository state:** early implementation of an Expo application with working learning flows and provider-backed AI/speech integration code. It is not yet a production release: cloud credentials, live database migrations, provider smoke tests and physical-device acceptance remain outstanding.

## Product experience

Elovio is organized around three connected experiences:

| Area | Intended experience |
|---|---|
| **Learn** | Personal learning path, visual vocabulary, listening and speaking practice, pronunciation feedback, spaced repetition, real-life scenarios, and an AI tutor |
| **Live** | User-started, two-way speech interpretation with speech recognition, translation, and spoken output |
| **Understand** | Camera and OCR assistance for menus, signs, messages, forms, invoices, and documents, with translation and plain-language explanations |

The first language set is Finnish (fi), Spanish (es), and English (en). The architecture is capability-driven so additional languages and regional variants can be added without embedding language assumptions throughout the application.

### Independent language settings

The following preferences are separate:
- Application interface language
- Native or preferred explanation language
- Language being learned
- Live interpretation source language
- Live interpretation target language

A language or language pair must not be advertised as supported until the relevant text, ASR, translation, and TTS paths have been verified.

### Learning approach

The learning principle is **See, hear, laugh, speak, remember**. Humor should make practice approachable; the learner is never the joke. Visuals are a core learning modality, not decoration: use relevant photographs, original illustrations, diagrams, illustrated situations, image matching and visual recall.

## Technology

| Layer | Current direction / status |
|---|---|
| Mobile application | Expo SDK 58, React Native 0.88, React 19.3, TypeScript |
| Navigation and app runtime | Expo application runtime; native development builds for native integrations |
| Local persistence | Expo SQLite-backed local storage |
| Authentication and data | Supabase Auth and PostgreSQL client integration; live project verification remains outstanding |
| Android native configuration | Firebase SDK/configuration files are present; live Firebase project availability is not independently verified |
| Crash reporting | Firebase Crashlytics SDK/configuration included; automatic collection is disabled pending a consent flow and device verification |
| Build and delivery | EAS development, preview, and production Android profiles; actual EAS project linking remains outstanding |
| Quality | TypeScript checks, learning-domain tests, Expo Doctor, Android export/prebuild validation, GitHub Actions |

Provider-backed integration slices are implemented in code: OpenAI Realtime speech recognition, AI Gateway translation and tutor, and AI Gateway speech synthesis. The native client uses the same TanStack Start API routes as the browser client. The live interpreter captures foreground microphone audio only after explicit consent, obtains a short-lived OpenAI Realtime credential from the shared API, routes recognized Finnish/Spanish/English turns through authenticated translation, and can play translated speech using the selected provider voice. These integrations are **not production-operational yet**: the Vercel project currently has no configured environment variables, required Supabase migrations have not been verified as applied, and no physical Android end-to-end test has been completed. OCR is not implemented. Bluetooth routing, speaker diarization, acoustic echo cancellation and background microphone service are also outstanding. Provider secrets must stay on a trusted server and must never be embedded in the mobile bundle.

## What is implemented now

The mobile application lives in `apps/mobile/`; shared API routes and database migrations live at the repository root. Isolated legacy provider contract fixtures used by tests live under `reference/mobile-provider-tests/`; mobile CI resolves them from the repository root and they are not part of the Expo runtime bundle. The feature branch currently contains:
- Finnish, Spanish, and English localization for the current application screens.
- Five independently stored language preferences.
- Device-local persistence so the app can be explored before cloud credentials are configured.
- A reviewed starter catalogue of 30 everyday phrases in Finnish, Spanish, and English.
- Interactive phrase practice, translation reveal, usage notes, and learner self-assessment.
- An authenticated multilingual AI tutor chat screen connected to the shared TanStack Start API and AI Gateway; live model responses require server-side AI Gateway access and the Supabase quota migration.
- A local learner profile with editable daily and weekly study goals.
- Device-local learning progress and foreground lesson-time summaries.
- Validated spaced-review scheduling, review history, and a dedicated due-review session.
- Visual vocabulary with two attributed photographs and four original native illustrations (house, coffee, bus, book), three-choice picture matching, typed recall, a three-image visual memory exercise, and device-local mastery count.
- Automated tests for learning-domain rules and content integrity.
- A native Understand text assistant that calls the same authenticated server endpoint as the web app; camera/image OCR remains a separately documented gap.
- Foreground live interpretation pipeline code: explicit microphone consent, ephemeral OpenAI Realtime sessions, PCM16 resampling/downmixing, voice-activity segmentation, partial/final transcript handling, automatic two-way language routing, authenticated shared translation, and optional provider-backed speech playback.
- Per-language female/male voice preferences, exact provider voice selection and temporary audio playback; the live voice catalogue is cached for the current interpreter session.
- Supabase client initialization, email/password authentication flows, SQLite-backed session persistence, and user-scoped language-preference synchronization code.
- Android Firebase native dependencies/configuration files and EAS build profiles.

**Important verification boundary:** Supabase flows still require the intended project URL and publishable key, the migration to be reviewed/applied, and end-to-end testing against that project. Authentication and preference code existing in the repository does not prove that a live Supabase project is connected or that RLS has been verified. The Firebase project must also be confirmed in its console. The native Firebase/Crashlytics setup requires a real development build and physical-device verification.

## Repository documentation

- [Product requirements (PRD)](docs/PRD.md)
- [Technical architecture](docs/ARCHITECTURE.md)
- [Implementation roadmap](docs/ROADMAP.md)
- [Project audit and source-of-truth index](docs/PROJECT_AUDIT.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Audio and voice requirements](docs/AUDIO_AND_VOICE.md)
- [Voice provider evaluation](docs/VOICE_PROVIDER_EVALUATION.md)
- [Provider and environment setup](docs/PROVIDER_SETUP.md)
- [Live interpreter implementation and limitations](docs/LIVE_INTERPRETER.md)
- [Firebase and Android release setup](docs/FIREBASE_RELEASE.md)

## Requirements

- Node.js **24.12.x or newer on the Node 24 line**.
- npm, Git, Android Studio/Android SDK for local Android builds.
- Xcode on macOS for local iOS builds.
- An Expo account and EAS project for cloud builds.
- A Supabase project for live authentication and cloud preference synchronization.

The app uses native Firebase modules. **Expo Go is not a substitute for the Elovio development build** when validating native functionality.

## Local development

```bash
git clone https://github.com/Tontsa128/Kielikurssi.git
cd Kielikurssi
npm install
npm run doctor
npm run typecheck
npm test
npx expo export --platform android
```

Start the JavaScript development server with `npx expo start`. For native functionality, first create and install an EAS development build, then use `npx expo start --dev-client`.

## Security and release boundaries

- Supabase client variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; verify RLS before live use.
- Shared server variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `LOVABLE_API_KEY` (AI tutor, translation, speech and Understand), `OPENAI_API_KEY` (native realtime session creation), and optional `APP_ALLOWED_ORIGINS`. Native app builds also need `EXPO_PUBLIC_API_BASE_URL` pointing to the deployed Elovio origin. See [provider setup](docs/PROVIDER_SETUP.md). Never expose server credentials through `EXPO_PUBLIC_*`.
- Never place Supabase secret/service-role keys, Firebase service-account credentials, database passwords, or AI-provider keys in the app or `EXPO_PUBLIC_*` variables.
- Firebase configuration status and required confirmation are documented in [FIREBASE_RELEASE.md](docs/FIREBASE_RELEASE.md).
- EAS project linking and physical-device acceptance are still required.
- Vercel preview is for browser UI review; it does not validate native microphone, Bluetooth, camera, background execution, or Firebase behavior.

## Quality rules

No mock/demo data presented as real, fake integrations, fabricated metrics, dead controls, unverified support claims, or secrets in source control. Each feature needs tests, security/privacy review, documentation, and real verification. See [the complete audit and roadmap](docs/PROJECT_AUDIT.md).
