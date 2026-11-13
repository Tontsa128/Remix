# Elovio development and service setup

## Repository workspaces

- Repository root: TanStack Start browser app, shared AI API routes and Vercel deployment.
- apps/mobile/: Expo SDK 58 / React Native 0.88 app.
- supabase/migrations/: shared database schema and API quota policies.

Run web commands from the repository root and native commands from apps/mobile/.

## Native development

Install with npm ci, then run npm run doctor, npm run typecheck, npm test and npx expo start from apps/mobile/.

Use a development build for native audio and Firebase functionality. Expo Go is not a substitute for testing microphone capture, playback, or crash reporting.

The mobile quality workflow validates Android and web exports. iOS prebuild is gated until the real Firebase GoogleService-Info.plist is supplied. The Android Firebase configuration is already in the workspace. Do not create a placeholder plist.

## Web development and Vercel

From the repository root, run bun install --frozen-lockfile, bun run dev, bun run lint, bun run test, bun run typecheck and bun run build.

The Vercel project is configured with the TanStack Start framework, Node 24.x, bun install --frozen-lockfile and bun run build. The repository also declares framework: tanstack-start in vercel.json.

## Environment variables

Configure public browser values in Vercel:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_PROJECT_ID

Configure matching server values in Vercel:

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- LOVABLE_API_KEY — required by @lovable.dev/ai-gateway for tutor, translation, transcription, speech and Understand
- OPENAI_API_KEY — required to create short-lived native Realtime transcription sessions
- APP_ALLOWED_ORIGINS — optional comma-separated exact HTTPS origins for additional browser origins

The Vercel project was checked and currently has no environment variables configured. Add these through Vercel Settings → Environment Variables. Never put LOVABLE_API_KEY, OPENAI_API_KEY or a Supabase service-role/secret key into a VITE_* or EXPO_PUBLIC_* variable.

The Expo app uses these public build-time values:

- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- EXPO_PUBLIC_API_BASE_URL — https://elovio.vercel.app for the production API

Set them in the EAS environment used by each build profile. Rebuild after changing them.

## Supabase migration order

Review and apply all migrations to the intended development project in order:

1. 20261107090000_initial_identity_and_language_preferences.sql
2. 20261108120000_learner_progress.sql
3. 20261108140000_tutor_rate_limits.sql
4. 20261108150000_interpreter_translation_limits.sql
5. 20261108160000_interpreter_speech_limits.sql
6. 20261108170000_interpreter_asr_session_limits.sql
7. 20261109160000_elovio_usage_limits.sql

The last migration adds the shared atomic public.elovio_consume_usage(text) function used by the web and native API. A committed migration is not proof that it has been applied to the live database.

## Static and live RLS tests

The normal mobile test suite includes static checks for owner-scoped RLS, read-only language catalogue access, private quota tables, and fixed-window limits.

For a real two-user RLS check, use only a disposable development Supabase project. Set these variables in a local shell:

- SUPABASE_TEST_URL
- SUPABASE_TEST_ANON_KEY
- SUPABASE_TEST_SERVICE_ROLE_KEY — privileged setup/cleanup only

Then run npm run test:rls from apps/mobile/.

The test creates two temporary users, verifies that one cannot read or modify the other's profile, language preferences or learning progress, checks that authenticated clients cannot read quota rows directly, and deletes both users. It never applies migrations. Do not use production credentials or production data.

## Current external blockers

- Vercel environment variables are not configured.
- The latest Vercel deployment could not be created because the Vercel deployment API reached its daily limit; retry after the limit resets.
- Supabase migrations have not been verified as applied to the live project.
- EAS project linking is outstanding; no verified EAS project ID is committed.
- iOS prebuild requires the real Firebase GoogleService-Info.plist.
- Physical-device microphone and audio acceptance has not been completed.
- Native camera/image OCR, Bluetooth routing, speaker diarization, echo cancellation and background microphone service remain incomplete.
