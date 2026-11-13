# Elovio unified implementation roadmap

The unified web/mobile integration is now on main. The integration branch was fast-forwarded after both CI workflows passed.

## Completed in main

- [x] Keep the TanStack Start browser application at the repository root.
- [x] Restore Expo SDK 58 / React Native 0.88 under apps/mobile/.
- [x] Preserve independent Bun and npm lockfiles.
- [x] Restore Android and web Expo CI validation.
- [x] Add web lint, tests, TypeScript and production build workflow.
- [x] Configure Dependabot for Bun, npm mobile workspace and GitHub Actions.
- [x] Share Supabase identity, language preferences, progress and API origin.
- [x] Connect native tutor, translation, speech and text Understand to shared API routes.
- [x] Add authenticated short-lived OpenAI Realtime session creation for native Live.
- [x] Align voice response schema with Expo parser and reject unsupported voice fallback.
- [x] Add atomic per-user shared API quota migration.
- [x] Restrict API CORS to same-origin or explicit allowlist.
- [x] Integrate native text-only Understand assistant; disclose native OCR gap.
- [x] Integrate illustrated four-step asking-directions exercise in FI/ES/EN.
- [x] Add static Supabase RLS/quota migration tests and opt-in two-user RLS test.
- [x] Remove tracked root .env and ignore local environment files.
- [x] Set Android and iOS bundle identifiers.
- [x] Configure Vercel TanStack Start framework, Bun install/build and Node 24.

## CI verification

- [x] Web workflow passed (run 42635873458): install, lint, tests, types and build.
- [x] Mobile workflow passed (run 42636878817): install, audit gate, tests, Expo Doctor, types, Android prebuild, Android export and Web export.
- [x] Generated route tree includes the native realtime-session route.
- [ ] iOS prebuild and build: skipped until the real Firebase GoogleService-Info.plist is added.

## External service and device acceptance

- [ ] Configure Vercel browser Supabase variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID.
- [ ] Configure Vercel server variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, LOVABLE_API_KEY, OPENAI_API_KEY; APP_ALLOWED_ORIGINS only if needed.
- [ ] Configure EAS public values: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY and EXPO_PUBLIC_API_BASE_URL.
- [ ] Apply all seven Supabase migrations to the intended project.
- [ ] Run npm run test:rls against a disposable development Supabase project with two test users.
- [ ] Verify tutor, translation, voice list, speech synthesis, Understand and Realtime session endpoints with real authenticated accounts.
- [ ] Retry Vercel Preview deployment after its daily deployment API limit resets.
- [ ] Link the EAS project and create an Android development build.
- [ ] Add the real iOS GoogleService-Info.plist and verify iOS prebuild/build.
- [ ] Test Finnish, Spanish and English interpretation in both directions on physical Android/iOS devices.
- [ ] Verify microphone permissions, network loss, stop behavior, interruptions and audio playback.
- [ ] Add camera/image picker and OCR to native Understand.
- [ ] Implement Bluetooth/earpiece routing, speaker separation, echo cancellation and background microphone service.
- [ ] Verify privacy, consent, data minimization and retention before production release.

## Release gate

No public release until both CI pipelines pass, live Supabase and AI provider tests pass, EAS builds are linked, iOS configuration is complete and physical-device acceptance is recorded. CI success alone does not prove production readiness.
