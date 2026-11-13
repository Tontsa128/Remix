# Firebase and Android release setup

## Repository configuration (not proof of live project availability)

The feature branch contains a `google-services.json` that references the following identifiers:

- Firebase project ID: `elovio-71887`
- Firebase project number: `358469609940`
- Android package: `com.elovio.app`
- Firebase Android app ID: `1:358469609940:android:382c9eee588fc1fb5d0e41`

**Important:** these values are read from the repository configuration. They do not prove that the Firebase project currently exists, that the connected account can access it, or that its services are active. The project lifecycle has previously changed during setup. Before relying on this configuration, an authorized owner must confirm the project and Android app in the Firebase console. If the project was deleted, do not reuse this file as evidence of a recreated project; register the Android app in the intended live project and replace the file with its freshly downloaded configuration.

The Android package must remain exactly `com.elovio.app`. Firebase's Android configuration file is client configuration, not a server credential. Restrict its API key in Google Cloud to the required Android application/package and signing certificate when release signing is configured. Never put service-account private keys, Admin SDK credentials, AI-provider keys, Supabase secret keys or database passwords in this file or in the mobile app.

## Expo development and release profiles

The repository includes EAS Build profiles in `eas.json`:

- `development`: internal Android APK with Expo development client
- `preview`: internal Android APK for device acceptance testing
- `production`: Android App Bundle for Google Play

The Expo development client dependency is pinned to the SDK 58-compatible release line. Expo Go is not sufficient for validating native integrations.

Before the first EAS build, an authorized project owner must:
1. Sign in to EAS CLI with the intended Expo account.
2. Run `eas init` in the repository and link the actual Elovio Expo project. This generates the real `extra.eas.projectId`; never invent this ID.
3. Confirm Android application ID remains `com.elovio.app`.
4. Confirm or recreate the Firebase project and Android app; download the matching `google-services.json` if required.
5. Configure Android signing credentials through EAS.
6. Run `npm run build:android:development`, install the resulting APK on a physical Android device and complete smoke tests.
7. Configure Google Play Console and test-track access before the production profile is submitted.

EAS profiles do not themselves create a Firebase App Distribution release or publish to Google Play. Those are separate, explicitly authorized release steps.

## Firebase services status

The native Firebase App and Crashlytics SDKs are dependencies and Expo config plugins. The repository includes Android client configuration, but the live Firebase project/app registration must be confirmed before building. Crashlytics automatic collection is explicitly disabled in `firebase.json` until a user-facing privacy/consent setting and opt-in flow are implemented. Crashlytics is not yet verified on a physical device. Firebase Analytics, Cloud Messaging, Firebase Authentication, Firestore and Storage are not configured as active application services.

Supabase remains the current authentication and database provider. Do not duplicate identity or user data in Firebase without a separate architecture decision.

## AI architecture

Firebase app registration does not provide an AI tutor or speech services automatically. AI provider credentials must remain on a trusted server. The mobile app should call a backend API with authenticated, rate-limited requests. The backend can then route to Gemini or another selected model through a provider adapter. Speech recognition, translation, text-to-speech, voice selection and live interpretation are separate capabilities and must be implemented and verified independently.

No AI-provider key may be embedded in `EXPO_PUBLIC_*` variables, the Android app or committed files.

## Crashlytics privacy gate

Crashlytics collection is disabled by default (`crashlytics_auto_collection_enabled: false`). Do not turn it on globally. Before enabling collection, implement a clear user-facing choice, explain diagnostic data in the privacy notice, persist the choice and call the native collection toggle only after affirmative consent. Also implement opt-out. A release build without this consent flow must continue to keep collection disabled.
