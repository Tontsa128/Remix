# Elovio unified platform audit — 9 November 2026

This document supersedes the earlier Expo-only audit snapshot and records the unified web/mobile integration.

## Source of truth

- Repository: Tontsa128/Kielikurssi
- Main branch: main
- Unified integration fast-forwarded to main at 7ce9effbecd7fce4e92cc4f5aa3bfdc84c96d393 after web and mobile CI passed.
- PR #2 and PR #3 were closed as superseded without merging; their useful changes were integrated into the main branch.
- Browser app: repository root (TanStack Start)
- Native app: apps/mobile/ (Expo SDK 58 / React Native 0.88)
- Shared API: src/routes/api.ai.*.ts and src/lib/elovio-api.server.ts
- Shared database: supabase/migrations/

## Integrated implementation

- Expo Android/iOS application restored alongside the existing browser application, with independent Bun and npm lockfiles.
- Stable Android package and iOS bundle identifiers configured.
- Both clients use the same Supabase identity/preferences/progress schema and shared AI API origin.
- Shared API routes cover tutor, translation, voice catalogue, speech synthesis, turn-based transcription and Understand.
- Native Live obtains short-lived OpenAI Realtime credentials from the shared authenticated API.
- Voice responses now match the Expo parser contract; unsupported voice IDs or gender mismatches are rejected rather than silently substituted.
- API CORS permits same-origin and exact allowlisted browser origins; native bearer-token clients without Origin remain supported.
- Shared atomic quota migration adds public.elovio_consume_usage(text) for tutor, translation, speech and ASR.
- Native Understand text assistant is connected to the shared Understand route. Native camera/image OCR is not implemented.
- The four-step illustrated asking-for-directions exercise is integrated into native Visual Vocabulary in FI/ES/EN.
- Static migration tests cover owner RLS, read-only language catalogue, private quota tables and fixed-window limits.
- An opt-in two-user Supabase RLS integration test is available through npm run test:rls; it has not been run against a live project.
- Root .env removed from version control; .env files are ignored.
- Dependabot configured for Bun root, npm mobile workspace and GitHub Actions.
- Separate web and mobile CI workflows restored.
- Vercel project settings updated to TanStack Start, Bun frozen install, Bun build and Node 24; vercel.json declares the framework.

## Verified CI

- Web workflow run 42635873458 passed: Bun install, ESLint, tests, TypeScript and production build. Verified commit: 32d2ae942ae9b8bd97dbd349467cc5a8d1e263e9.
- Mobile workflow run 42636596392 passed: npm ci, high/critical audit gate, learning/security tests, Expo Doctor, TypeScript, Android prebuild, Android export and Web export. Verified commit: 87ca9d779f089f8d55ef7f27fa6be5110c2889be.
- iOS prebuild was explicitly skipped because the real Firebase GoogleService-Info.plist is not present. This is a known external configuration blocker, not a passing iOS build.
- The live two-user RLS test, EAS native build and physical-device tests have not been run.

## External blockers

- Vercel currently has no environment variables configured.
- Server needs LOVABLE_API_KEY for @lovable.dev/ai-gateway and OPENAI_API_KEY for native Realtime session creation; matching Supabase values are also required.
- Vercel deployment API daily quota was reached while attempting a preview deployment. The project settings were updated, but a new deployment could not be verified until the quota resets.
- Seven migrations are committed but not verified as applied to the live Supabase project.
- EAS project linking and project ID are outstanding.
- iOS Firebase GoogleService-Info.plist is missing.
- Physical Android/iOS microphone, audio playback, interruptions and Bluetooth behavior are not verified.
- Native camera/image OCR, Bluetooth/earpiece routing, speaker diarization, echo cancellation and background microphone service remain incomplete.

## Release decision

The repository code now has a coherent web/mobile structure and both CI pipelines pass. This is not yet a production-ready release: credentials, live migrations, EAS linking, iOS Firebase configuration, provider smoke tests and physical-device acceptance remain.
