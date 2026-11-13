# Elovio — Product Requirements Document

**Status:** Initial product baseline  
**Working name:** Elovio (replaceable)  
**Initial languages:** Finnish (fi), Spanish (es), English (en)  
**Target platforms:** Android and iOS

## 1. Product vision

Elovio helps people learn languages and communicate in real-life situations. It is a commercial, international platform rather than a single-language course or a simple translation utility.

The product combines three distinct capabilities:

1. **Learn:** personal AI language teacher.
2. **Live:** two-way, user-initiated speech interpretation.
3. **Understand:** camera/OCR language assistant for everyday content.

## 2. Language preferences

Users can configure these independently:
- UI language
- Native / preferred explanation language
- Language being learned
- Interpretation source language
- Interpretation target language

Language definitions and capabilities must come from a language registry, not hard-coded conditionals. The first release targets Finnish, Spanish, and English. Additional languages can be introduced through data and capability configuration.

A language or language pair may only be advertised as supported after its relevant text, speech recognition, translation, and speech synthesis paths have passed real tests.

## 3. Learn — personal AI teacher

Required capabilities:
- Learning profile, goals, and proficiency level
- Structured lessons and adaptive practice
- Visual vocabulary: relevant image, target word, learner-language explanation, pronunciation guidance, and audio
- Listening and speaking practice
- Pronunciation analysis and actionable feedback
- Vocabulary review and spaced repetition
- AI tutor conversations
- Progress tracking based on real completed activities
- Real-life role-play scenarios
- Ongoing story world with recurring characters

Pedagogy: **See, hear, laugh, speak, remember.** Humor must be kind; the learner is never the joke. Use accurate, pedagogically relevant visuals rather than random generic imagery.

Initial scenario areas include cafés/restaurants, shopping, pharmacy/healthcare, renting a home, neighbors/friends, transport/travel, and public services.

The initial Spanish story world may use fictional recurring characters: Carmen (neighbor), Miguel (café owner), Rosa (pharmacist), Antonio (landlord), and Pedro (friend). Content should distinguish natural everyday speech, polite standard language, regional expressions, and dialect notes.

## 4. Live — speech interpretation

Required flow:
1. User explicitly starts an interpretation session.
2. App captures audio with clear permission and visible active-state indication.
3. Speech recognition produces source text.
4. Language identification detects or confirms the language.
5. Translation produces the target text.
6. The app communicates uncertainty and allows review where appropriate.
7. Speech synthesis plays the translated result through the selected audio route.
8. The same process works in the reverse direction.

Capabilities:
- Text translation
- Speech-to-text
- Automatic language identification
- Two-person conversation mode
- Text and audio output
- Bluetooth audio routing where supported
- Language-switch detection
- Immediate stop control
- Explicit error and uncertainty states

Background audio is platform-specific. Android requires a compliant foreground service and persistent notification. iOS behavior must stay within Apple's permitted background audio and microphone policies. Do not promise unrestricted background listening. Recording and conversation retention are off by default.

## 5. Understand — everyday language assistant

The user can capture or select an image containing a menu, sign, bill, message, form, or document. The app should present:
- Extracted original text
- Translation
- Plain-language explanation
- Important dates, amounts, and conditions when confidently extracted
- Suggested next steps, clearly separated from facts

OCR and model uncertainty must be visible. Legal, medical, and financial explanations are not official professional advice. Sensitive content must not be unnecessarily retained or written to logs.

## 6. Experience and accessibility

- Mobile-first, clear navigation
- Independent language settings
- Text alternatives for audio content
- Readable typography and accessible controls
- Clear microphone and camera state
- No shame-based learning, punitive streaks, or forced learning streaks
- Useful error, loading, offline, and permission-denied states

## 7. Commercial requirements

A freemium subscription model is a future capability, not an MVP assumption. Proposed price tiers are not approved. Measure real AI provider costs, usage, and gross margin before setting prices. Usage enforcement and billing must be server-authoritative.

## 8. Privacy and security

- GDPR-aware data lifecycle, export, and deletion
- Explicit consent and permissions for microphone/camera access
- No default retention of raw audio
- User-scoped authorization and database row-level security
- Secrets only on trusted server environments
- Minimize sensitive content in logs
- Review subprocessors and provider data policies

## 9. Quality bar

No fake integrations, demo data presented as real, invented metrics, dead controls, or placeholder features presented as complete. Each feature requires:
- Acceptance criteria
- Unit and integration tests where applicable
- End-to-end or device tests for user journeys
- Security and privacy review
- Documented known limitations

A feature is complete only after implementation and verification.
