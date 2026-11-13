# Shared web and mobile provider setup

The browser app and Expo app use one TanStack Start API under `/api/ai/*`. Both authenticate against the same Supabase project. The Expo app calls the deployed API origin; the browser uses same-origin routes.

## Browser build variables

Set these in the Vercel project for Preview and Production:

| Variable | Purpose | Public |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser Supabase URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key, protected by RLS | Yes |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier used by the web shell | Yes |

## Server-only variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Server Supabase endpoint |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side user-token validation and RPC calls |
| `LOVABLE_API_KEY` | Authenticates `@lovable.dev/ai-gateway` for tutor, translation, speech synthesis and Understand |\n| `OPENAI_API_KEY` | Creates short-lived OpenAI Realtime transcription credentials for native Live |
| `APP_ALLOWED_ORIGINS` | Optional comma-separated exact browser origins for cross-origin requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Only for explicitly trusted admin-only server modules; never used in browser/mobile code |

AI tutor, translation, text transcription, speech synthesis and image understanding use the Lovable AI Gateway. The server package reads `LOVABLE_API_KEY`; a Vercel AI Gateway key is not a substitute. Configure `LOVABLE_API_KEY` as an encrypted Vercel server variable. Do not create `VITE_*` or `EXPO_PUBLIC_*` copies of provider secrets.

## Expo build variables

Set in the local `apps/mobile/.env.local` or protected EAS environment:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Same Supabase URL as web |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same publishable key as web |
| `EXPO_PUBLIC_API_BASE_URL` | Deployed Elovio origin, e.g. `https://elovio.vercel.app` |

These are public client values. Database security depends on Supabase Auth and RLS, not on hiding the publishable key.

## Ordered Supabase migrations

Review and apply the migrations to the intended Supabase project in this order:

1. `20261107090000_initial_identity_and_language_preferences.sql`
2. `20261108120000_learner_progress.sql`
3. `20261108140000_tutor_rate_limits.sql`
4. `20261108150000_interpreter_translation_limits.sql`
5. `20261108160000_interpreter_speech_limits.sql`
6. `20261108170000_interpreter_asr_session_limits.sql`
7. `20261109160000_elovio_usage_limits.sql`

The current shared API calls `public.elovio_consume_usage(text)` for tutor, translation, speech and transcription quotas. A committed migration does not prove that the live database has been updated. Apply it only after confirming the project target and reviewing the SQL. Verify RLS and two-user isolation with a disposable development project before production.

## Verification sequence

1. Confirm the Vercel project and Supabase project identifiers refer to the intended Elovio environments.
2. Add public and server-only environment values through the secure dashboards; never commit local environment files.
3. Apply the ordered migrations to a disposable Preview/Development database and verify Auth, RLS and quota RPCs.
4. Deploy Preview and test the tutor, translation, voice list, speech synthesis, Understand text/image route and native realtime-session route separately.
5. Build a native development app and verify microphone permission, realtime connection, translation, speech playback, stop behavior and network loss on a physical Android device.
6. Verify Finnish, Spanish and English in both interpretation directions before advertising those combinations.
7. Promote to Production only after the above checks pass.

## Current external blockers

- Vercel environment variables were observed to be empty. The required `LOVABLE_API_KEY`, `OPENAI_API_KEY` and Supabase values still need to be configured.
- Supabase migrations, including the shared usage-quota migration, are committed but not verified as applied live.
- EAS project linking is outstanding; the mobile app has Android and iOS bundle identifiers but no verified EAS project ID.
- Physical Android and iOS audio tests have not been completed.
- Native Understand currently accepts text only. Camera/image OCR is not implemented in the Expo app.
- Bluetooth routing, background microphone service, speaker diarization and acoustic echo cancellation remain incomplete.
