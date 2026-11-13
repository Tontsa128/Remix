# Elovio — Technical Architecture Baseline

**Status:** Proposed architecture; validate against repository and platform constraints before implementation.

## 1. Architecture principles

- TypeScript-first where appropriate.
- Clear separation between mobile client, backend, learning domain, interpretation domain, and document-understanding domain.
- Provider-independent adapters for AI capabilities.
- Server-side authorization, usage enforcement, and secrets.
- Capability-driven language registry.
- Privacy by default, especially for audio and documents.
- Testable interfaces and observable production behavior.

## 2. Proposed technology direction

| Layer | Initial direction |
|---|---|
| Mobile | React Native + Expo + TypeScript |
| Backend | Node.js + TypeScript |
| API | REST for standard operations; streaming/WebSocket for real-time sessions |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage with strict access policies |
| Error monitoring | Sentry or equivalent, selected before production |
| CI | GitHub Actions |
| Testing | Unit, integration, API contract, and device/E2E tests |

**Initial mobile baseline selected:** Expo SDK 58.0.23, React Native 0.88.1, and React 19.3.0. SDK 58's minimum Node.js requirement is 22.13.x. The repository uses Node.js 24.12 or newer as its operational baseline because the currently resolved Firebase dependency tree declares that engine requirement. The repository pins Expo Doctor as a development dependency; CI runs it before TypeScript and Android bundle checks. The backend, database, monitoring, and provider choices remain proposals until separately configured and verified.

## 3. Domain boundaries

### Mobile application
Navigation, accessible screens, local preferences, permission flows, audio/camera interaction, and session presentation.

### Backend API
Authentication verification, authorization, business rules, provider credentials, subscription and quota enforcement, rate limiting, audit-safe telemetry, and AI provider orchestration.

### Learning Engine
Learning profiles, lesson sequencing, exercises, vocabulary, review scheduling, pronunciation feedback, and progress records.

### Translation Engine
Speech recognition (ASR), language identification, translation, speech synthesis (TTS), session orchestration, streaming, and interruption handling.

### Understanding Engine
Image intake, OCR, extraction, translation, explanation, confidence/uncertainty handling, and safe temporary-file lifecycle.

Learning and interpretation histories must remain separate by purpose and retention policy.

## 4. Language registry

Store language metadata and capability declarations as data. Candidate fields:
- BCP 47 language tag and display names
- Writing direction and locale variants
- ASR availability and tested status
- Translation availability by source/target pair
- TTS availability and voice metadata
- Automatic language identification support
- Learning-content availability
- Quality/test evidence and last verification date

Do not infer support from provider marketing lists. Capability status must reflect tests run by this product.

## 5. Initial data domains

Potential entities, subject to schema design:
- users / profiles
- user_settings
- user_language_preferences
- languages / language_capabilities / language_pairs
- learning_profiles
- lessons / lesson_exercises / vocabulary / review_history
- pronunciation_results
- story_characters / scenarios / audio_lessons
- translation_sessions / translation_preferences / translation_usage
- usage_records
- subscription_plans / subscriptions / payment_events

Before migrations, define ownership, RLS policies, indexes, retention, deletion, and audit requirements for every table.

## 6. Security and privacy

- Never ship provider API keys in the mobile bundle.
- Verify authenticated identity and authorization on the server.
- Apply RLS to user-owned data and test cross-user isolation.
- Validate uploads and restrict file types, size, and access.
- Avoid storing raw audio by default; delete temporary data promptly.
- Redact sensitive text from logs and error telemetry.
- Make active microphone state obvious and provide an immediate stop action.
- Document provider processing, retention, and data residency before selection.

## 7. Native platform constraints

Background microphone behavior cannot be treated as a normal cross-platform UI feature. Android foreground-service requirements and iOS background execution/audio policies need separate implementation and physical-device verification. Bluetooth routing and headset microphone selection also require device tests.

## 8. Brand isolation

Keep display name, logo, colors, icons, and marketing copy in a replaceable brand/configuration layer. Do not use the working name as a database key, API contract, or domain identifier.

## 9. Architecture decision records

Record material decisions in `docs/decisions/` before implementation where they affect data, security, provider choice, native permissions, or long-term compatibility.

## 10. Visual learning content and media

Visual material is a core learning modality in Elovio, not decorative UI. Lessons and vocabulary must support both real photographs and purposeful illustrations/drawings from the beginning.

- Content records declare media type explicitly (photograph, illustration, diagram, or sequence) and provide meaningful alternative descriptions in every supported UI/content language.
- Photographs must have a verified source, author, licence, and attribution requirements. Commercial reuse must be permitted before inclusion. Keep source records alongside the content.
- Original drawings and illustrations should be authored or commissioned for the learning objective, be visually clear at phone size, and be reusable across vocabulary, stories, grammar explanations, and exercises.
- Use a consistent visual vocabulary: the same concept should retain recognizable imagery across its lesson, review cards, and story contexts.
- Exercise types should include image recognition, word-to-image matching, image-to-word recall, sequencing, visual contrasts, and illustrated dialogues—not only text input.
- Images must have a graceful offline/loading/error strategy, appropriate resolution and compression, and accessible descriptions. Do not make a network-loaded image the only way to complete an exercise.
- Do not use emoji as a substitute for required photographs or illustrations. Do not use unlicensed search-result images.
- Visual material should teach context and meaning (objects, actions, places, expressions, situations), not merely label isolated objects.


## Scripted conversation practice

The café dialogue is a deterministic, localized learning exercise with reviewed response options and corrective feedback. It is not an AI-generated conversation and must not be presented as an AI tutor. Future AI conversation practice must run through an authenticated server-side provider adapter, with safety, privacy, usage limits and failure handling.


## Account learning progress sync

Learning progress is stored as a versioned, bounded JSON snapshot in `public.learner_progress`. The client validates all phrase and vocabulary identifiers against the shipped catalogues before merging or persisting remote data. RLS restricts select/insert/update to `auth.uid() = user_id`; no delete permission is granted. Sign-in and session completion trigger sync. Snapshot merging is deterministic but the current client read-merge-upsert flow is not an atomic multi-device transaction; production multi-device conflict guarantees require a server-side atomic merge or optimistic concurrency check. Do not claim live cloud sync until the migration is applied and cross-user tests pass.


## AI tutor API — first provider-backed vertical slice

The Node.js Vercel function at `api/ai/tutor.ts` exposes an authenticated `POST /api/ai/tutor` endpoint. It verifies the Supabase access token with Auth, applies an atomic per-user fixed-window quota through `consume_tutor_rate_limit`, validates a bounded conversation payload, and calls Gemini through the provider-independent `TutorProvider` contract (with a Gemini implementation) from the server only. The provider uses `generationConfig.responseMimeType` with `generationConfig.responseJsonSchema`; the API validates required fields, catalogue-bound visual IDs and text bounds before returning a learner-facing reply. A versioned `AI_TUTOR_v1` system prompt lives in `api/_lib/tutor-prompt.ts`. The mobile bundle never receives the provider key. User messages and provider responses are not written to application logs or persisted by this endpoint.

Required Vercel environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY` (server-only; never prefix with `EXPO_PUBLIC_`)
- Optional `GEMINI_MODEL` (defaults to `gemini-3.5-flash-lite`)
- Optional `APP_ALLOWED_ORIGINS` (comma-separated exact browser origins; browser requests are denied when an Origin header is present but not listed)

The initial quota is 12 requests per authenticated user per 60 seconds. The database migration must be applied before requests can pass the quota gate. The endpoint is connected to the localized `TutorChat` screen. The screen sends bounded learner progress and displays catalogue-backed visual cues selected by the model. The feature cannot be considered production-ready until Vercel environment setup, live Supabase migration/RLS verification, provider smoke tests, usage-cost monitoring, and abuse testing are complete. The server responds with explicit configuration/provider errors rather than fabricating tutor replies.


The Gemini adapter uses the current `generateContent` JSON response schema field (`generationConfig.responseJsonSchema`) and sends the API key in the `x-goog-api-key` header, never in the URL query string. The default model is `gemini-3.5-flash-lite`; configure `GEMINI_MODEL` only with a model available to the project.
