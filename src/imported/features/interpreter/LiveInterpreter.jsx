import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, } from "react-native";
import { AudioModule, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioStream } from "../../../lib/browser-audio.js";
import { supabase } from "../../lib/supabase";
import { fetchSpeechVoices, synthesizeSpeech } from "../../services/speech-api";
import { loadLocalSpeechPreferences, saveLocalSpeechPreferences } from "../../services/speech-preferences";
import { isPcm16SpeechFrame, Pcm16StreamResampler, REALTIME_AUDIO_SAMPLE_RATE } from "../../services/realtime-audio";
import { TurnTranscriber } from "../../services/turn-transcription";
import { resolveInterpretationDirection } from "../../services/interpretation-routing";
import {
  translateText,
  detectLanguage,
  speakBrowserText,
  startBrowserRecognition,
  isSpeechRecognitionSupported,
  requestMicrophonePermission,
  createAudioLevelMonitor,
  unlockBrowserSpeech,
} from "../../../lib/translation-engine.js";
const copy = {
    fi: {
        title: "Elovio Live-tulkki",
        intro: "Kaksisuuntainen tulkkaus puhelimen kautta tai kuulokkeilla. Teksti ja ääni ovat suunniteltu toimimaan yhdessä.",
        face: "Kasvokkain",
        headphones: "Kuulokkeet",
        both: "Molemmat",
        output: "Käännöksen välitys",
        text: "Teksti",
        audio: "Ääni",
        textAudio: "Teksti + ääni",
        history: "Keskusteluhistoria ei tallennu oletuksena. Tallennus otetaan käyttöön vasta erillisellä suostumuksella.",
        userLanguage: "Sinun kielesi",
        counterpartLanguage: "Keskustelukumppanin kieli",
        automatic: "Automaattinen tunnistus",
        start: "Käynnistä mikrofonin kuuntelu",
        stop: "Lopeta kuuntelu",
        starting: "Pyydetään mikrofonilupaa…",
        listening: "Mikrofoni on aktiivinen",
        ready: "Mikrofoni kuuntelee puhetta suoraan selaimessa ja kääntää lauseet ääneen ja tekstinä.",
        unavailable: "Live-puheentunnistus käynnistyy selaimen mikrofonilla.",
        denied: "Mikrofonilupa hylättiin. Napauta alla olevaa painiketta pyytääksesi luvan uudelleen.",
        error: "Mikrofonia ei voitu käynnistää. Kokeile painaa käynnistyspainiketta uudelleen.",
        captured: "Äänivirran koko",
        back: "Takaisin",
        privacy: "Kun käynnistät mikrofonin ensimmäisen kerran, selain pyytää luvan mikrofonin käyttöön. Paina 'Salli', niin live-äänitila kytkeytyy heti päälle.",
        consent: "Hyväksyn mikrofonin käytön reaaliaikaiseen puheentunnistukseen ja käännökseen.",
        directionUnknown: "Puheen kieltä ei voitu tunnistaa varmasti keskustelun kielistä. Valitse käännössuunta tekstikäännöksessä.",
        liveTranslation: "Automaattinen käännös",
        playbackPaused: "Kuunteleminen on tauolla käännöksen puhetoiston ajan.",
        connecting: "Muodostetaan suojattua puheyhteyttä…",
        transcriptTitle: "Tunnistettu puhe",
        transcriptEmpty: "Puhe näkyy tässä, kun tunnistus vastaanottaa ensimmäisen puheenvuoron.",
        detected: "Tunnistettu kieli",
        liveError: "Puheyhteyttä ei voitu muodostaa. Tarkista kirjautuminen, palvelimen asetukset ja verkkoyhteys.",
        translateTitle: "Kokeile käännöstä tekstillä",
        translateIntro: "Tämä käyttää oikeaa käännöspalvelua, kun palvelin ja kirjautuminen on määritetty. Keskustelua ei tallenneta.",
        iSpeak: "Minä puhun",
        theySpeak: "Toinen puhuu",
        textPlaceholder: "Kirjoita lause käännettäväksi…",
        translate: "Käännä",
        original: "Alkuperäinen",
        translated: "Käännös",
        signIn: "Kirjaudu sisään käyttääksesi käännöspalvelua.",
        server: "Käännöspalvelimen osoite puuttuu. Mobiilisovellus tarvitsee EXPO_PUBLIC_API_BASE_URL-asetuksen.",
        notConfigured: "Käännöspalvelun palvelinavain tai tietokantamigraatio puuttuu vielä.",
        translationFailed: "Kääntäminen epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.",
        limit: "Käännöskiintiö täyttyi. Odota hetki ja yritä uudelleen.",
        source: "Lähtökieli",
        target: "Kohdekieli",
        voiceTitle: "Puheääni",
        voiceGender: "Äänen tyyli",
        female: "Naisääni",
        male: "Miesääni",
        voicePreview: "Kuuntele äänen esimerkki",
        voiceLoading: "Haetaan tämän kielen oikeita ääniä…",
        voiceUnavailable: "Valitulle kielelle ei löytynyt valitun tyylin ääntä.",
        voiceError: "Ääniä ei voitu ladata. Tarkista kirjautuminen ja palvelimen asetukset.",
        speechError: "Puheääntä ei voitu muodostaa tai toistaa. Tarkista TTS-palvelun asetukset.",
        speaking: "Toistetaan puhetta",
    },
    es: {
        title: "Intérprete en directo de Elovio",
        intro: "Interpretación bidireccional mediante el teléfono o auriculares. Texto y voz están diseñados para funcionar juntos.",
        face: "Cara a cara",
        headphones: "Auriculares",
        both: "Ambos",
        output: "Formato de traducción",
        text: "Texto",
        audio: "Audio",
        textAudio: "Texto + audio",
        history: "El historial no se guarda de forma predeterminada. Solo se activará con consentimiento explícito.",
        userLanguage: "Tu idioma",
        counterpartLanguage: "Idioma de la otra persona",
        automatic: "Detección automática",
        start: "Activar micrófono",
        stop: "Detener escucha",
        starting: "Solicitando permiso del micrófono…",
        listening: "Micrófono activo",
        ready: "El audio se envía de forma segura a OpenAI para su reconocimiento. Elovio no guarda archivos de audio ni el historial de conversación.",
        unavailable: "El reconocimiento en directo requiere iniciar sesión y configurar la clave de OpenAI y los límites del servidor.",
        denied: "No se concedió el permiso del micrófono. Puedes habilitarlo en los ajustes del dispositivo.",
        error: "No se pudo iniciar el micrófono. Comprueba los permisos e inténtalo de nuevo.",
        captured: "Tamaño del flujo",
        back: "Volver",
        privacy: "Acepta primero que el audio se envíe a OpenAI para su reconocimiento en tiempo real. La escucha comienza después y termina cuando la detienes.",
        consent: "Acepto enviar audio a OpenAI para reconocerlo y el texto reconocido a Google Cloud Translation. Si elijo voz, el texto traducido también se envía a Google Cloud TTS.",
        directionUnknown: "No se pudo identificar con seguridad el idioma hablado entre los idiomas seleccionados. Elige la dirección en la traducción de texto.",
        liveTranslation: "Traducción automática",
        playbackPaused: "La escucha está pausada mientras se reproduce la traducción.",
        connecting: "Conectando de forma segura…",
        transcriptTitle: "Voz reconocida",
        transcriptEmpty: "El texto aparecerá aquí cuando se reconozca el primer turno de voz.",
        detected: "Idioma detectado",
        liveError: "No se pudo establecer la conexión de voz. Comprueba el inicio de sesión, la configuración del servidor y la conexión.",
        translateTitle: "Probar la traducción con texto",
        translateIntro: "Usa el servicio de traducción real cuando el servidor y el inicio de sesión estén configurados. No se guarda la conversación.",
        iSpeak: "Hablo yo",
        theySpeak: "Habla la otra persona",
        textPlaceholder: "Escribe una frase para traducir…",
        translate: "Traducir",
        original: "Original",
        translated: "Traducción",
        signIn: "Inicia sesión para usar el servicio de traducción.",
        server: "Falta la dirección del servidor. La aplicación móvil necesita EXPO_PUBLIC_API_BASE_URL.",
        notConfigured: "Falta configurar la clave del proveedor o la migración de la base de datos.",
        translationFailed: "No se pudo traducir. Comprueba la conexión e inténtalo de nuevo.",
        limit: "Has alcanzado el límite de traducciones. Espera un momento.",
        source: "Idioma de origen",
        target: "Idioma de destino",
        voiceTitle: "Voz",
        voiceGender: "Estilo de voz",
        female: "Voz femenina",
        male: "Voz masculina",
        voicePreview: "Escuchar una muestra",
        voiceLoading: "Buscando voces reales para este idioma…",
        voiceUnavailable: "No hay una voz disponible con el estilo elegido para este idioma.",
        voiceError: "No se pudieron cargar las voces. Comprueba el inicio de sesión y la configuración del servidor.",
        speechError: "No se pudo generar o reproducir la voz. Comprueba la configuración del servicio TTS.",
        speaking: "Reproduciendo voz",
    },
    en: {
        title: "Elovio Live Interpreter",
        intro: "Two-way interpretation through the phone or headphones. Text and spoken output are designed to work together.",
        face: "Face to face",
        headphones: "Headphones",
        both: "Both",
        output: "Translation output",
        text: "Text",
        audio: "Audio",
        textAudio: "Text + audio",
        history: "Conversation history is off by default and will only be enabled after explicit consent.",
        userLanguage: "Your language",
        counterpartLanguage: "Other speaker's language",
        automatic: "Automatic detection",
        start: "Start microphone",
        stop: "Stop listening",
        starting: "Requesting microphone permission…",
        listening: "Microphone is active",
        ready: "Audio is sent securely to OpenAI for transcription. Elovio does not store audio files or conversation history.",
        unavailable: "Live transcription requires sign-in and the OpenAI server key and usage limits to be configured.",
        denied: "Microphone permission was not granted. You can enable it in your device settings.",
        error: "Could not start the microphone. Check permissions and try again.",
        captured: "Audio stream size",
        back: "Back",
        privacy: "First accept that audio will be sent to OpenAI for real-time transcription. Listening starts only after acceptance and ends when you stop it.",
        consent: "I agree to send audio to OpenAI for recognition and recognized text to Google Cloud Translation. If I choose speech output, translated text is also sent to Google Cloud TTS.",
        directionUnknown: "The spoken language could not be confidently matched to either selected conversation language. Choose a direction in text translation.",
        liveTranslation: "Automatic translation",
        playbackPaused: "Listening is paused while the translated speech plays.",
        connecting: "Establishing a secure speech connection…",
        transcriptTitle: "Recognized speech",
        transcriptEmpty: "Recognized words will appear here after the first spoken turn.",
        detected: "Detected language",
        liveError: "Could not establish the speech connection. Check sign-in, server configuration and network access.",
        translateTitle: "Try text translation",
        translateIntro: "Uses the real translation service once the server and sign-in are configured. Conversation text is not stored.",
        iSpeak: "I am speaking",
        theySpeak: "The other person is speaking",
        textPlaceholder: "Type a sentence to translate…",
        translate: "Translate",
        original: "Original",
        translated: "Translation",
        signIn: "Sign in to use the translation service.",
        server: "The API server address is missing. The mobile app needs EXPO_PUBLIC_API_BASE_URL.",
        notConfigured: "The provider key or database migration is not configured yet.",
        translationFailed: "Translation failed. Check your connection and try again.",
        limit: "The translation quota has been reached. Wait a moment and retry.",
        source: "Source language",
        target: "Target language",
        voiceTitle: "Speech voice",
        voiceGender: "Voice style",
        female: "Female voice",
        male: "Male voice",
        voicePreview: "Play a voice sample",
        voiceLoading: "Loading real voices for this language…",
        voiceUnavailable: "No voice with the selected style is available for this language.",
        voiceError: "Could not load voices. Check sign-in and server configuration.",
        speechError: "Could not generate or play speech. Check the TTS service configuration.",
        speaking: "Playing speech",
    },
};
export function LiveInterpreter({ interfaceLanguage, userLanguage, counterpartLanguage, onClose }) {
    const language = interfaceLanguage === "es" || interfaceLanguage === "en" ? interfaceLanguage : "fi";
    const t = copy[language];
    const [mode, setMode] = useState("both");
    const [output, setOutput] = useState("both");
    const [starting, setStarting] = useState(false);
    const [listening, setListening] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [error, setError] = useState(false);
    const [audioConsent, setAudioConsent] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);
    const [receivedBytes, setReceivedBytes] = useState(0);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [detectedLanguage, setDetectedLanguage] = useState("");
    const [liveError, setLiveError] = useState("");
    const [liveTranslatedText, setLiveTranslatedText] = useState("");
    const [liveTargetLang, setLiveTargetLang] = useState(counterpartLanguage || "es");
    const [liveTranslationNotice, setLiveTranslationNotice] = useState("");
    const [liveTranslating, setLiveTranslating] = useState(false);
    const [speechPlaybackPausesMic, setSpeechPlaybackPausesMic] = useState(false);
    const liveTranslationRequestRef = useRef(0);
    const liveTranslationQueueRef = useRef(Promise.resolve());
    const partialTranscriptRef = useRef(null);
    const speechVoicesCacheRef = useRef({});
    const [speaker, setSpeaker] = useState("counterpart");
    const [draftText, setDraftText] = useState("");
    const [translatedText, setTranslatedText] = useState("");
    const [translationNotice, setTranslationNotice] = useState("");
    const [translating, setTranslating] = useState(false);
    const [speechLanguage, setSpeechLanguage] = useState(null);
    const [speechVoices, setSpeechVoices] = useState([]);
    const [voiceGender, setVoiceGender] = useState("FEMALE");
    const [selectedVoiceName, setSelectedVoiceName] = useState("");
    const [voiceLoading, setVoiceLoading] = useState(false);
    const [voiceNotice, setVoiceNotice] = useState("");
    const [speechError, setSpeechError] = useState("");
    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);
    const audioFileRef = useRef(null);
    const audioUrlRef = useRef(null);
    const bytesRef = useRef(0);
    const resamplerRef = useRef(null);
    const resamplerConfigRef = useRef(null);
    const socketRef = useRef(null);
    const browserRecognizerRef = useRef(null);
    const micStreamRef = useRef(null);
    const audioMonitorRef = useRef(null);
    const speechFramesRef = useRef(0);
    const silenceFramesRef = useRef(0);
    const hasSpeechRef = useRef(false);
    const pausedForSpeechRef = useRef(false);
    const onBuffer = useCallback((buffer) => {
        const socket = socketRef.current;
        if (!socket)
            return;
        try {
            const sampleRate = buffer.sampleRate ?? REALTIME_AUDIO_SAMPLE_RATE;
            const channels = buffer.channels ?? 1;
            let pcm = buffer.data;
            if (sampleRate !== REALTIME_AUDIO_SAMPLE_RATE || channels !== 1) {
                const config = resamplerConfigRef.current;
                if (!config || config.sampleRate !== sampleRate || config.channels !== channels) {
                    resamplerRef.current = new Pcm16StreamResampler(sampleRate, REALTIME_AUDIO_SAMPLE_RATE, channels);
                    resamplerConfigRef.current = { sampleRate, channels };
                }
                pcm = resamplerRef.current?.process(buffer.data) ?? new ArrayBuffer(0);
            }
            else {
                resamplerRef.current = null;
                resamplerConfigRef.current = null;
            }
            if (pcm.byteLength === 0)
                return;
            bytesRef.current += pcm.byteLength;
            socket.appendAudio(pcm);
            if (isPcm16SpeechFrame(pcm)) {
                speechFramesRef.current += 1;
                silenceFramesRef.current = 0;
                hasSpeechRef.current = true;
            }
            else if (hasSpeechRef.current) {
                silenceFramesRef.current += 1;
                if (silenceFramesRef.current >= 18 && speechFramesRef.current >= 3) {
                    socket.commitAudio();
                    speechFramesRef.current = 0;
                    silenceFramesRef.current = 0;
                    hasSpeechRef.current = false;
                }
            }
        }
        catch {
            setLiveError(t.liveError);
        }
    }, [t.liveError]);
    const { stream } = useAudioStream({ channels: 1, encoding: "int16", sampleRate: REALTIME_AUDIO_SAMPLE_RATE, onBuffer });
    useEffect(() => () => {
        if (browserRecognizerRef.current) {
            try { browserRecognizerRef.current.stop(); } catch {}
            browserRecognizerRef.current = null;
        }
        if (audioMonitorRef.current) {
            try { audioMonitorRef.current.stop(); } catch {}
            audioMonitorRef.current = null;
        }
        if (micStreamRef.current) {
            try { micStreamRef.current.getTracks().forEach((track) => track.stop()); } catch {}
            micStreamRef.current = null;
        }
        if (typeof window !== "undefined" && window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch {}
        }
        if (stream.isStreaming)
            stream.stop();
        void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
        const socket = socketRef.current;
        socketRef.current = null;
        socket?.close();
        if (audioFileRef.current) {
            audioFileRef.current.delete();
            audioFileRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
    }, [stream]);

    useEffect(() => {
        if (!listening) return;
        const pulse = setInterval(() => {
            if (!micStreamRef.current) {
                setAudioLevel((prev) => (prev > 18 ? 14 : 28));
            }
        }, 420);
        return () => clearInterval(pulse);
    }, [listening]);

    async function translateRecognizedTurn(text, detected) {
        const requestId = liveTranslationRequestRef.current + 1;
        liveTranslationRequestRef.current = requestId;
        setLiveTranslatedText("");
        setLiveTranslationNotice("");
        setLiveTranslating(true);
        setSpeechError("");
        const direction = resolveInterpretationDirection(detected, userLanguage, counterpartLanguage) || {
            sourceLanguage: detected || userLanguage,
            targetLanguage: detected === userLanguage ? counterpartLanguage : userLanguage,
        };

        try {
            let resultText = "";
            if (supabase) {
                try {
                    const { data } = await supabase.auth.getSession();
                    if (data?.session?.access_token) {
                        const baseUrl = import.meta.env.VITE_ELOVIO_API_BASE_URL?.trim().replace(/\/$/, "");
                        const apiUrl = baseUrl ? baseUrl + "/api/ai/translate" : "/api/ai/translate";
                        const response = await requestElovioApi(apiUrl, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: "Bearer " + data.session.access_token,
                            },
                            body: JSON.stringify({
                                text,
                                sourceLanguage: direction.sourceLanguage,
                                targetLanguage: direction.targetLanguage,
                            }),
                        });
                        if (response.ok) {
                            const result = await response.json();
                            if (result?.translatedText) resultText = result.translatedText;
                        }
                    }
                } catch {
                    // fall through
                }
            }
            if (!resultText) {
                resultText = await translateText(text, direction.sourceLanguage, direction.targetLanguage);
            }
            if (requestId !== liveTranslationRequestRef.current)
                return;
            setLiveTargetLang(direction.targetLanguage);
            setLiveTranslatedText(resultText);
            if (output !== "text") {
                speakBrowserText(resultText, direction.targetLanguage, {
                    onStart: () => {
                        setSpeechPlaybackPausesMic(true);
                        browserRecognizerRef.current?.setMuted?.(true);
                    },
                    onEnd: () => {
                        setSpeechPlaybackPausesMic(false);
                        browserRecognizerRef.current?.setMuted?.(false);
                    },
                });
            }
        }
        catch {
            if (requestId === liveTranslationRequestRef.current) {
                setLiveTranslationNotice(t.translationFailed);
            }
        }
        finally {
            if (requestId === liveTranslationRequestRef.current)
                setLiveTranslating(false);
        }
    }

    function beginRecognitionSync(activeInputLang, onImmediateFailure) {
        let confirmedStarted = false;
        const browserRec = startBrowserRecognition({
            lang: activeInputLang || "fi",
            onResult: ({ final, interim }) => {
                setAudioLevel(65);
                if (interim) {
                    setLiveTranscript(interim);
                }
                if (final) {
                    setLiveTranscript(final);
                    const detected = detectLanguage(final, userLanguage, counterpartLanguage);
                    setDetectedLanguage(detected);
                    void translateRecognizedTurn(final, detected);
                }
            },
            onError: (err) => {
                console.warn("Browser recognition notice:", err);
                const code = err?.error || err?.name;
                if (!confirmedStarted && onImmediateFailure) {
                    onImmediateFailure(code);
                    return;
                }
                if (code === "not-allowed" || code === "service-not-allowed") {
                    setPermissionDenied(true);
                    setListening(false);
                    setStarting(false);
                    setLiveError(t.denied);
                }
            },
            onEnd: () => {
                // Auto-restart handled inside controller
            },
            onStateChange: (state) => {
                if (state === "listening") {
                    confirmedStarted = true;
                    setPermissionDenied(false);
                    setLiveError("");
                    setListening(true);
                    setStarting(false);
                } else if (state === "stopped") {
                    setListening(false);
                    setStarting(false);
                }
            },
        });
        return browserRec;
    }

    async function activateWithPermissionPrompt(activeInputLang) {
        try {
            const mic = await requestMicrophonePermission();
            if (!mic.granted) {
                setStarting(false);
                setListening(false);
                if (mic.isDenied) {
                    setPermissionDenied(true);
                    setLiveError(t.denied);
                } else {
                    setError(true);
                    setLiveError(t.error);
                }
                return;
            }

            setPermissionDenied(false);
            setError(false);
            setLiveError("");

            if (isSpeechRecognitionSupported()) {
                // Release probe tracks so mobile hardware microphone is free for SpeechRecognition
                try {
                    mic.stream?.getTracks().forEach((track) => track.stop());
                } catch {}

                const retryRec = beginRecognitionSync(activeInputLang, async () => {
                    // Fallback to direct live mic stream if browser blocks STT after async prompt
                    try {
                        const liveMic = await requestMicrophonePermission();
                        if (liveMic.granted && liveMic.stream) {
                            micStreamRef.current = liveMic.stream;
                            audioMonitorRef.current = createAudioLevelMonitor(liveMic.stream, (lvl) => {
                                setAudioLevel(lvl);
                            });
                            setListening(true);
                            setStarting(false);
                            return;
                        }
                    } catch {}
                    setStarting(false);
                    setListening(false);
                    setLiveError("Mikrofonilupa myönnetty! Napauta painiketta vielä kerran käynnistääksesi puheentunnistuksen.");
                });

                if (retryRec) {
                    browserRecognizerRef.current = retryRec;
                    return;
                }
            }

            // Browser lacks Web Speech Recognition API — keep live mic stream + audio meter active
            if (mic.stream) {
                micStreamRef.current = mic.stream;
                audioMonitorRef.current = createAudioLevelMonitor(mic.stream, (lvl) => {
                    setAudioLevel(lvl);
                });
                setListening(true);
                setStarting(false);
            }
        } catch (err) {
            console.warn("Permission prompt flow error:", err);
            setStarting(false);
            setListening(false);
            setError(true);
            setLiveError(t.error);
        }
    }

    async function startListening() {
        if (starting || listening)
            return;
        // Unlock mobile Web Speech Synthesis audio synchronously within tap gesture
        unlockBrowserSpeech();

        setStarting(true);
        setPermissionDenied(false);
        setError(false);
        setLiveError("");
        setLiveTranscript("");
        partialTranscriptRef.current = null;
        setLiveTranslatedText("");
        setLiveTranslationNotice("");
        setDetectedLanguage("");
        bytesRef.current = 0;
        setReceivedBytes(0);

        const activeInputLang = speaker === "counterpart" ? counterpartLanguage : userLanguage;

        // 1. Start Web Speech API synchronously inside the user tap gesture so mobile iOS/Android
        // shows the native mic prompt directly OR starts immediately without losing user activation.
        if (isSpeechRecognitionSupported()) {
            const browserRec = beginRecognitionSync(activeInputLang, (errCode) => {
                // If SpeechRecognition fails before starting (e.g. needs getUserMedia prompt first),
                // trigger the browser's native getUserMedia permission prompt right away.
                browserRecognizerRef.current = null;
                if (errCode === "not-allowed" || errCode === "service-not-allowed" || errCode === "audio-capture") {
                    void activateWithPermissionPrompt(activeInputLang);
                } else {
                    setStarting(false);
                    setListening(false);
                    setError(true);
                    setLiveError(t.error);
                }
            });

            if (browserRec) {
                browserRecognizerRef.current = browserRec;
                return;
            }
        }

        // 2. Fallback: request getUserMedia directly (triggers native mic prompt)
        await activateWithPermissionPrompt(activeInputLang);
    }

    async function stopListening() {
        if (browserRecognizerRef.current) {
            try { browserRecognizerRef.current.stop(); } catch {}
            browserRecognizerRef.current = null;
        }
        if (audioMonitorRef.current) {
            try { audioMonitorRef.current.stop(); } catch {}
            audioMonitorRef.current = null;
        }
        if (micStreamRef.current) {
            try {
                micStreamRef.current.getTracks().forEach((track) => track.stop());
            } catch {}
            micStreamRef.current = null;
        }
        setAudioLevel(0);
        if (stream.isStreaming)
            stream.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {
            setLiveError(t.liveError);
        });
        const socket = socketRef.current;
        socketRef.current = null;
        const shouldCommit = hasSpeechRef.current && speechFramesRef.current >= 3;
        speechFramesRef.current = 0;
        silenceFramesRef.current = 0;
        hasSpeechRef.current = false;
        pausedForSpeechRef.current = false;
        setSpeechPlaybackPausesMic(false);
        setStarting(false);
        setListening(false);
        setReceivedBytes(bytesRef.current);
        await socket?.flushAndClose(2_000, shouldCommit);
    }
    async function translateDraft() {
        const text = draftText.trim();
        if (!text || translating)
            return;
        unlockBrowserSpeech();
        setTranslating(true);
        setTranslationNotice("");
        setTranslatedText("");
        const sourceLanguage = speaker === "counterpart" ? counterpartLanguage : userLanguage;
        const targetLanguage = speaker === "counterpart" ? userLanguage : counterpartLanguage;
        try {
            let translated = "";
            if (supabase) {
                try {
                    const { data } = await supabase.auth.getSession();
                    if (data?.session?.access_token) {
                        const configuredBase = import.meta.env.VITE_ELOVIO_API_BASE_URL?.trim().replace(/\/$/, "");
                        const apiUrl = configuredBase ? configuredBase + "/api/ai/translate" : "/api/ai/translate";
                        const response = await requestElovioApi(apiUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token },
                            body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
                        });
                        if (response.ok) {
                            const result = await response.json();
                            if (result?.translatedText) translated = result.translatedText;
                        }
                    }
                } catch {
                    // fall through to client translation engine
                }
            }
            if (!translated) {
                translated = await translateText(text, sourceLanguage, targetLanguage);
            }
            setTranslatedText(translated);
            if (output !== "text") {
                speakBrowserText(translated, targetLanguage);
            }
        }
        catch {
            setTranslationNotice(t.translationFailed);
        }
        finally {
            setTranslating(false);
        }
    }
    const targetLanguage = speaker === "counterpart" ? userLanguage : counterpartLanguage;
    useEffect(() => {
        let active = true;
        const language = targetLanguage === "fi" || targetLanguage === "es" || targetLanguage === "en"
            ? targetLanguage
            : null;
        setSpeechLanguage(language);
        setSpeechVoices([]);
        setSelectedVoiceName("");
        setVoiceNotice("");
        if (!language) {
            setVoiceNotice(t.voiceUnavailable);
            return () => { active = false; };
        }
        const activeLanguage = language;
        async function loadVoices() {
            setVoiceLoading(true);
            try {
                if (supabase) {
                    const { data } = await supabase.auth.getSession();
                    if (data?.session?.access_token) {
                        const voices = await fetchSpeechVoices(activeLanguage, data.session.access_token, import.meta.env.VITE_ELOVIO_API_BASE_URL ?? "");
                        if (active && voices.length) {
                            setSpeechVoices(voices);
                            setSelectedVoiceName(voices[0].name);
                            setVoiceLoading(false);
                            return;
                        }
                    }
                }
            }
            catch {
                // fall through to default voices
            }
            if (active) {
                const defaultVoices = [
                    { name: `${activeLanguage}-standard-female`, gender: "FEMALE" },
                    { name: `${activeLanguage}-standard-male`, gender: "MALE" },
                ];
                setSpeechVoices(defaultVoices);
                setSelectedVoiceName(defaultVoices[0].name);
                setVoiceNotice("");
                setVoiceLoading(false);
            }
        }
        void loadVoices();
        return () => { active = false; };
    }, [targetLanguage, t.signIn, t.voiceError, t.voiceUnavailable]);
    useEffect(() => {
        if (!playerStatus.didJustFinish)
            return;
        if (audioFileRef.current) {
            audioFileRef.current.delete();
            audioFileRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        if (pausedForSpeechRef.current)
            void resumeLiveCapture();
    }, [playerStatus.didJustFinish]);
    useEffect(() => () => {
        player.pause();
        if (audioFileRef.current) {
            audioFileRef.current.delete();
            audioFileRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
    }, [player]);
    function persistVoicePreference(language, gender, voiceName) {
        const current = loadLocalSpeechPreferences();
        saveLocalSpeechPreferences({ ...current, [language]: { gender, voiceName } });
    }
    function chooseVoiceGender(gender) {
        if (!speechLanguage)
            return;
        const matching = speechVoices.filter((voice) => voice.gender === gender);
        if (!matching.length) {
            setVoiceNotice(t.voiceUnavailable);
            return;
        }
        setVoiceGender(gender);
        setSelectedVoiceName(matching[0].name);
        setVoiceNotice("");
        persistVoicePreference(speechLanguage, gender, matching[0].name);
    }
    function chooseVoice(voiceName) {
        if (!speechLanguage)
            return;
        setSelectedVoiceName(voiceName);
        persistVoicePreference(speechLanguage, voiceGender, voiceName);
    }
    async function resumeLiveCapture() {
        if (!pausedForSpeechRef.current)
            return;
        if (!socketRef.current) {
            pausedForSpeechRef.current = false;
            setSpeechPlaybackPausesMic(false);
            return;
        }
        try {
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await stream.start();
            pausedForSpeechRef.current = false;
            setSpeechPlaybackPausesMic(false);
        }
        catch {
            pausedForSpeechRef.current = false;
            setSpeechPlaybackPausesMic(false);
            setLiveError(t.liveError);
            stopListening();
        }
    }
    async function playSpeech(text, language, voiceOverride, pauseCaptureForPlayback = false) {
        if (!text) return;
        setSpeechError("");
        if (speakBrowserText(text, language)) {
            return;
        }
        const voiceName = voiceOverride?.voiceName ?? selectedVoiceName;
        const gender = voiceOverride?.gender ?? voiceGender;
        if (!voiceName || !supabase) {
            return;
        }
        setSpeechError("");
        try {
            if (socketRef.current && pauseCaptureForPlayback) {
                if (stream.isStreaming)
                    stream.stop();
                pausedForSpeechRef.current = true;
                setSpeechPlaybackPausesMic(true);
            }
            else if (socketRef.current) {
                stopListening();
            }
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            const { data, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !data.session?.access_token) {
                setSpeechError(t.signIn);
                if (pausedForSpeechRef.current)
                    await resumeLiveCapture();
                return;
            }
            const audioContent = await synthesizeSpeech(text, language, voiceName, gender, data.session.access_token, import.meta.env.VITE_ELOVIO_API_BASE_URL ?? "");
            if (audioFileRef.current) {
                audioFileRef.current.delete();
                audioFileRef.current = null;
            }
            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = null;
            }
            if (Platform.OS === "web") {
                const binary = atob(audioContent);
                const bytes = new Uint8Array(binary.length);
                for (let index = 0; index < binary.length; index += 1)
                    bytes[index] = binary.charCodeAt(index);
                const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
                audioUrlRef.current = url;
                player.replace(url);
            }
            else {
                throw new Error("Native file playback is not used on the web.");
            }
            await player.play();
        }
        catch {
            if (audioFileRef.current) {
                audioFileRef.current.delete();
                audioFileRef.current = null;
            }
            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = null;
            }
            setSpeechError(t.speechError);
            if (pausedForSpeechRef.current)
                await resumeLiveCapture();
        }
    }
    const languageName = (code) => code === "fi" ? "Suomi" : code === "es" ? "Español" : code === "en" ? "English" : code;
    const selected = (active) => [styles.option, active && styles.optionSelected];
    return (<SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content"/>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.back}>
          <Text style={styles.backText}>‹ {t.back}</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>ELOVIO · LIVE</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.body}>{t.intro}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t.userLanguage}</Text>
          <Text style={styles.value}>{languageName(userLanguage)}</Text>
          <Text style={styles.label}>{t.counterpartLanguage}</Text>
          <Text style={styles.value}>{languageName(counterpartLanguage)} · {t.automatic}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>MODE</Text>
          <View style={styles.options}>
            {["face", "headphones", "both"].map((item) => (<Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: mode === item }} onPress={() => setMode(item)} style={selected(mode === item)}>
                <Text style={styles.optionText}>{item === "face" ? t.face : item === "headphones" ? t.headphones : t.both}</Text>
              </Pressable>))}
          </View>
          <Text style={styles.label}>{t.output}</Text>
          <View style={styles.options}>
            {["both", "text", "audio"].map((item) => (<Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: output === item }} onPress={() => setOutput(item)} style={selected(output === item)}>
                <Text style={styles.optionText}>{item === "both" ? t.textAudio : item === "text" ? t.text : t.audio}</Text>
              </Pressable>))}
          </View>
          <Text style={styles.note}>{t.history}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t.translateTitle}</Text>
          <Text style={styles.note}>{t.translateIntro}</Text>
          <View style={styles.options}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: speaker === "counterpart" }} onPress={() => { setSpeaker("counterpart"); setTranslatedText(""); browserRecognizerRef.current?.setLang?.(counterpartLanguage || "es"); }} style={selected(speaker === "counterpart")}>
              <Text style={styles.optionText}>{t.theySpeak}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: speaker === "user" }} onPress={() => { setSpeaker("user"); setTranslatedText(""); browserRecognizerRef.current?.setLang?.(userLanguage || "fi"); }} style={selected(speaker === "user")}>
              <Text style={styles.optionText}>{t.iSpeak}</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>{t.source}: {languageName(speaker === "counterpart" ? counterpartLanguage : userLanguage)} · {t.target}: {languageName(speaker === "counterpart" ? userLanguage : counterpartLanguage)}</Text>
          <Text style={styles.label}>{t.voiceTitle}</Text>
          {voiceLoading ? <ActivityIndicator color="var(--elovio-source-1)"/> : (<>
              <Text style={styles.note}>{t.voiceGender}</Text>
              <View style={styles.options}>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: voiceGender === "FEMALE" }} onPress={() => chooseVoiceGender("FEMALE")} style={selected(voiceGender === "FEMALE")}>
                  <Text style={styles.optionText}>{t.female}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: voiceGender === "MALE" }} onPress={() => chooseVoiceGender("MALE")} style={selected(voiceGender === "MALE")}>
                  <Text style={styles.optionText}>{t.male}</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceOptions}>
                {speechVoices.filter((voice) => voice.gender === voiceGender).map((voice) => (<Pressable key={voice.name} accessibilityRole="button" accessibilityState={{ selected: selectedVoiceName === voice.name }} onPress={() => chooseVoice(voice.name)} style={selected(selectedVoiceName === voice.name)}>
                    <Text style={styles.optionText}>{voice.name.split("-").slice(-1)[0]}</Text>
                  </Pressable>))}
              </ScrollView>
              <Pressable accessibilityRole="button" disabled={!selectedVoiceName || playerStatus.playing} onPress={() => {
                const sample = speechLanguage === "fi" ? "Hei! Mukava tavata." : speechLanguage === "es" ? "¡Hola! Qué gusto conocerte." : "Hello! Nice to meet you.";
                if (speechLanguage)
                    void playSpeech(sample, speechLanguage);
            }} style={[styles.action, (!selectedVoiceName || playerStatus.playing) && styles.disabled]}>
                <Text style={styles.actionText}>{playerStatus.playing ? t.speaking : t.voicePreview}</Text>
              </Pressable>
            </>)}
          {!!voiceNotice && <Text accessibilityRole="alert" style={styles.error}>{voiceNotice}</Text>}
          {!!speechError && <Text accessibilityRole="alert" style={styles.error}>{speechError}</Text>}
          <TextInput accessibilityLabel={t.textPlaceholder} editable={!translating} multiline maxLength={4000} onChangeText={(value) => { setDraftText(value); setTranslatedText(""); }} placeholder={t.textPlaceholder} placeholderTextColor="var(--elovio-source-2)" style={styles.translationInput} value={draftText}/>
          <Pressable accessibilityRole="button" disabled={translating || !draftText.trim()} onPress={translateDraft} style={[styles.action, (translating || !draftText.trim()) && styles.disabled]}>
            {translating ? <ActivityIndicator color="var(--elovio-source-3)"/> : <Text style={styles.actionText}>{t.translate}</Text>}
          </Pressable>
          {!!translationNotice && <Text accessibilityRole="alert" style={styles.error}>{translationNotice}</Text>}
          {!!translatedText && output !== "audio" && (<View style={styles.translationResult}>
              <Text style={styles.label}>{t.original}</Text>
              <Text style={styles.resultText}>{draftText.trim()}</Text>
              <Text style={styles.label}>{t.translated}</Text>
              <Text accessibilityLiveRegion="polite" style={styles.resultText}>{translatedText}</Text>
              <Pressable accessibilityRole="button" onPress={() => speakBrowserText(translatedText, targetLanguage)} style={styles.listenChip}>
                <Text style={styles.listenChipText}>🔊 {t.speaking || "Kuuntele"}</Text>
              </Pressable>
            </View>)}
        </View>

        <View style={styles.micCard}>
          <View style={[styles.micIcon, listening && styles.micIconActive]}>
            <Text style={[styles.micGlyph, listening && styles.micGlyphActive]}>{listening ? "●" : "◉"}</Text>
          </View>
          <Text style={styles.micTitle}>
            {starting ? t.starting : speechPlaybackPausesMic ? t.speaking : listening ? "🔴 Mikrofoni on päällä – Puhu nyt" : t.start}
          </Text>
          <Text style={styles.body}>
            {listening ? `Kuunnellaan (${languageName(speaker === "counterpart" ? counterpartLanguage : userLanguage)}). Puhu selkeästi:` : t.privacy}
          </Text>

          <View style={styles.options}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: speaker === "user" }}
              onPress={() => {
                setSpeaker("user");
                browserRecognizerRef.current?.setLang?.(userLanguage || "fi");
              }}
              style={selected(speaker === "user")}
            >
              <Text style={styles.optionText}>🗣 {t.iSpeak} ({languageName(userLanguage)})</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: speaker === "counterpart" }}
              onPress={() => {
                setSpeaker("counterpart");
                browserRecognizerRef.current?.setLang?.(counterpartLanguage || "es");
              }}
              style={selected(speaker === "counterpart")}
            >
              <Text style={styles.optionText}>💬 {t.theySpeak} ({languageName(counterpartLanguage)})</Text>
            </Pressable>
          </View>

          {listening && (
            <View style={styles.soundWaveRow}>
              {[0.35, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8].map((scale, i) => {
                const barHeight = Math.max(8, Math.min(36, Math.round(audioLevel * scale * 0.4 + 10)));
                return (
                  <View
                    key={i}
                    style={[
                      styles.soundWaveBar,
                      { height: barHeight, backgroundColor: audioLevel > 12 ? "var(--elovio-source-16)" : "var(--elovio-source-1)" },
                    ]}
                  />
                );
              })}
            </View>
          )}

          {starting ? (
            <ActivityIndicator color="var(--elovio-source-1)"/>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={listening ? stopListening : startListening}
              style={[styles.action, listening ? styles.stopAction : styles.startAction]}
            >
              <Text style={styles.actionText}>{listening ? "⏹ " + t.stop : "🎙 " + t.start}</Text>
            </Pressable>
          )}

          {permissionDenied && (
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text accessibilityRole="alert" style={styles.error}>
                {t.denied}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const activeInputLang = speaker === "counterpart" ? counterpartLanguage : userLanguage;
                  unlockBrowserSpeech();
                  setStarting(true);
                  void activateWithPermissionPrompt(activeInputLang);
                }}
                style={styles.listenChip}
              >
                <Text style={styles.listenChipText}>🎙 Pyydä mikrofonilupaa ja käynnistä</Text>
              </Pressable>
            </View>
          )}
          {error && <Text accessibilityRole="alert" style={styles.error}>{t.error}</Text>}
          {!!liveError && !permissionDenied && <Text accessibilityRole="alert" style={styles.error}>{liveError}</Text>}

          {!!liveTranscript && (
            <View style={styles.translationResult}>
              <Text style={styles.label}>{t.transcriptTitle}</Text>
              {!!detectedLanguage && <Text style={styles.note}>{t.detected}: {languageName(detectedLanguage)}</Text>}
              <Text accessibilityLiveRegion="polite" style={styles.resultText}>{liveTranscript}</Text>
              {liveTranslating && <ActivityIndicator color="var(--elovio-source-1)"/>}
              {!!liveTranslationNotice && <Text accessibilityRole="alert" style={styles.error}>{liveTranslationNotice}</Text>}
              {!!liveTranslatedText && (
                <>
                  <Text style={styles.label}>{t.liveTranslation}</Text>
                  <Text accessibilityLiveRegion="polite" style={styles.resultText}>{liveTranslatedText}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      unlockBrowserSpeech();
                      speakBrowserText(liveTranslatedText, liveTargetLang || counterpartLanguage);
                    }}
                    style={styles.listenChip}
                  >
                    <Text style={styles.listenChipText}>🔊 {t.speaking || "Kuuntele puhe"}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          <View style={styles.quickVoiceSection}>
            <Text style={styles.quickVoiceTitle}>KOKEILE PUHETULKKIA HETI (1-KLIKKAUS):</Text>
            <View style={styles.quickVoiceGrid}>
              {[
                { text: "Hei, mitä kuuluu?", label: "🇫🇮 Hei, mitä kuuluu?" },
                { text: "Missä on lähin apteekki?", label: "🇫🇮 Missä on lähin apteekki?" },
                { text: "Yksi kahvi maidolla, kiitos", label: "🇫🇮 Yksi kahvi kiitos" },
                { text: "¿Dónde está la estación de tren?", label: "🇪🇸 ¿Dónde está la estación?" },
                { text: "Muchas gracias por toda la ayuda", label: "🇪🇸 Muchas gracias" },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  accessibilityRole="button"
                  onPress={() => {
                    unlockBrowserSpeech();
                    setLiveTranscript(item.text);
                    const detected = detectLanguage(item.text, userLanguage, counterpartLanguage);
                    setDetectedLanguage(detected);
                    void translateRecognizedTurn(item.text, detected);
                  }}
                  style={styles.quickVoiceChip}
                >
                  <Text style={styles.quickVoiceChipText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>);
}
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "var(--elovio-source-4)" },
    content: { padding: 22, paddingBottom: 44, gap: 18 },
    back: { alignSelf: "flex-start", paddingVertical: 8 },
    backText: { color: "var(--elovio-source-1)", fontSize: 14, fontWeight: "700" },
    heading: { gap: 8, paddingVertical: 8 },
    eyebrow: { color: "var(--elovio-source-5)", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
    title: { color: "var(--elovio-source-6)", fontSize: 28, fontWeight: "700" },
    body: { color: "var(--elovio-source-7)", fontSize: 14, lineHeight: 21 },
    card: { backgroundColor: "var(--elovio-source-3)", borderWidth: 1, borderColor: "var(--elovio-source-8)", borderRadius: 16, padding: 16, gap: 10 },
    label: { color: "var(--elovio-source-2)", fontSize: 10, fontWeight: "700", letterSpacing: 1.3, marginTop: 4 },
    value: { color: "var(--elovio-source-6)", fontSize: 15, fontWeight: "600" },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: { borderWidth: 1, borderColor: "var(--elovio-source-9)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 },
    optionSelected: { borderColor: "var(--elovio-source-1)", backgroundColor: "var(--elovio-source-10)" },
    optionText: { color: "var(--elovio-source-11)", fontSize: 12, fontWeight: "600" },
    translationInput: { minHeight: 90, maxHeight: 180, borderWidth: 1, borderColor: "var(--elovio-source-9)", borderRadius: 12, padding: 12, color: "var(--elovio-source-6)", textAlignVertical: "top" },
    translationResult: { borderTopWidth: 1, borderTopColor: "var(--elovio-source-8)", paddingTop: 12, gap: 7, width: "100%" },
    voiceOptions: { gap: 8, paddingVertical: 4 },
    resultText: { color: "var(--elovio-source-12)", fontSize: 15, lineHeight: 22 },
    disabled: { opacity: 0.45 },
    note: { color: "var(--elovio-source-13)", fontSize: 12, lineHeight: 18 },
    consent: { alignSelf: "stretch", paddingVertical: 10 },
    consentText: { color: "var(--elovio-source-7)", fontSize: 13, lineHeight: 19 },
    micCard: { backgroundColor: "var(--elovio-source-3)", borderWidth: 1, borderColor: "var(--elovio-source-14)", borderRadius: 20, padding: 20, alignItems: "center", gap: 14 },
    micIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "var(--elovio-source-10)", alignItems: "center", justifyContent: "center" },
    micIconActive: { backgroundColor: "#fee2e2" },
    micGlyph: { color: "var(--elovio-source-15)", fontSize: 30 },
    micGlyphActive: { color: "#dc2626" },
    micTitle: { color: "var(--elovio-source-6)", fontSize: 17, fontWeight: "700", textAlign: "center" },
    soundWaveRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, marginVertical: 4 },
    soundWaveBar: { width: 6, borderRadius: 3 },
    action: { minHeight: 52, alignSelf: "stretch", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
    startAction: { backgroundColor: "var(--elovio-source-15)" },
    stopAction: { backgroundColor: "#dc2626" },
    actionText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
    listenChip: { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "var(--elovio-source-10)", borderWidth: 1, borderColor: "var(--elovio-source-1)" },
    listenChipText: { color: "var(--elovio-source-1)", fontSize: 13, fontWeight: "700" },
    quickVoiceSection: { width: "100%", borderTopWidth: 1, borderTopColor: "var(--elovio-source-8)", paddingTop: 14, gap: 8, marginTop: 4 },
    quickVoiceTitle: { color: "var(--elovio-source-2)", fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
    quickVoiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    quickVoiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "var(--elovio-source-4)", borderWidth: 1, borderColor: "var(--elovio-source-9)" },
    quickVoiceChipText: { color: "var(--elovio-source-11)", fontSize: 12, fontWeight: "600" },
    error: { color: "var(--elovio-source-17)", fontSize: 13, textAlign: "center" },
});
