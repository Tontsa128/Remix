# Kielikurssi repository import

Source: https://github.com/Tontsa128/Kielikurssi (main).
Visual reference: https://elovio.vercel.app.

This is a source migration, not a capture of the GitHub repository page. The Expo app's React screens, translations, learning domain, and original illustrations are adapted to the project's TanStack Start shell using react-native-web. Source TypeScript is transpiled to browser-safe JavaScript without changing its learning rules. Original source palette values are represented by global CSS tokens.

## Verified
- Home screen and all sections on desktop (1280 × 1800) and phone (390 × 844).
- Finnish/English language switching, preference saving, and profile persistence after reload.
- Lesson theme selection, written answer, reveal, marking known, next phrase, and return.
- Visual vocabulary correct-answer feedback and every visual exercise mode.
- Interpreter opening, output selection, text input, unavailable-service notice, and return.
- AI tutor's sign-in-required notice.
- Original photographs load through stored project asset pointers with original attribution.
- No preview page errors or horizontal overflow in the recorded flows.
- 83 original learning-domain tests and the project's home routing test pass.

## Services not migrated or connected
The source deployment has no configured account or API service. This import deliberately preserves that offline-only state: sign-in, cloud synchronization, AI tutor, translation, speech synthesis, and realtime transcription are not operational. Existing user accounts/data, native Firebase monitoring, Android/iOS builds, and Vercel API handlers are not migrated. Provider credentials and account-store migration are needed for those services; none were supplied, and no private source configuration was copied.

The browser audio adapter preserves the interpreter screen and safe cleanup. Real microphone streaming and speech playback remain unverified because their server services are unavailable. This is not a claim that native audio is fully migrated.

## Source defect
Returning from the source interpreter causes a blank page (`Cannot read properties of null (reading 'isStreaming')`) on desktop and phone. The browser adapter avoids this crash; the preview returns successfully without reloading.

## Assets
- Red apple: Wikimedia Commons, Plismo, CC BY-SA 3.0 → src/assets/red-apple.asset.json.
- Golden retriever: Wikimedia Commons, A throne man, CC0 1.0 → src/assets/golden-retriever.asset.json.
- Elovio's original shape-based illustrations remain interactive React rendering, not bitmap substitutes.

No captured motion, pinned sections, or videos required a static fallback or normal-flow replacement.

Comparison evidence: observations/source.json and observations/comparison.json. Screenshots referenced there were captured in temporary browser storage during verification.