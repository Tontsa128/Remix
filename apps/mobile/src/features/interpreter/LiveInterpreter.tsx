import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AudioModule, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioStream } from "expo-audio";
import { File, Paths } from "expo-file-system";
import type { LanguageCode } from "../../config/languages";
import { supabase } from "../../lib/supabase";
import { fetchSpeechVoices, synthesizeSpeech, type SpeechVoice } from "../../services/speech-api";
import { loadLocalSpeechPreferences, saveLocalSpeechPreferences, type SpeechLanguage } from "../../services/speech-preferences";
import { isPcm16SpeechFrame, Pcm16StreamResampler, REALTIME_AUDIO_SAMPLE_RATE } from "../../services/realtime-audio";
import { createRealtimeTranscriptionSession } from "../../services/realtime-transcription-api";
import { RealtimeTranscriptionSocket } from "../../services/realtime-transcription";
import { resolveInterpretationDirection } from "../../services/interpretation-routing";

type Props = {
  interfaceLanguage: LanguageCode;
  userLanguage: LanguageCode;
  counterpartLanguage: LanguageCode;
  onClose: () => void;
};

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
    ready: "Puhe lähetetään suojatulla yhteydellä OpenAI:lle tunnistusta varten. Elovio ei tallenna äänitiedostoa tai keskusteluhistoriaa.",
    unavailable: "Live-puheentunnistus vaatii kirjautumisen sekä palvelimen OpenAI-avaimen ja käyttökiintiön asetukset.",
    denied: "Mikrofonilupaa ei myönnetty. Voit sallia mikrofonin käytön laitteen asetuksista.",
    error: "Mikrofonia ei voitu käynnistää. Tarkista käyttöoikeudet ja kokeile uudelleen.",
    captured: "Äänivirran koko",
    back: "Takaisin",
    privacy: "Hyväksy ensin, että puheääni lähetetään OpenAI:lle tunnistettavaksi. Kuuntelu alkaa vasta tämän jälkeen ja päättyy, kun pysäytät sen.",
    consent: "Hyväksyn puheäänen lähettämisen OpenAI:lle tunnistusta varten. Tunnistettu teksti lähetetään Elovion palveluun käännettäväksi, ja äänitulosteessa käännös lähetetään puhepalvelulle.",
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
    consent: "Acepto enviar audio a OpenAI para reconocerlo. El texto reconocido se envía al servicio de Elovio para traducirlo y, si elijo voz, el texto traducido se envía al servicio de voz.",
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
    consent: "I agree to send audio to OpenAI for recognition. Recognized text is sent to Elovio's translation service and, when I choose speech output, translated text is sent to its speech service.",
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
} as const;

type CopyKey = keyof typeof copy.fi;

export function LiveInterpreter({ interfaceLanguage, userLanguage, counterpartLanguage, onClose }: Props) {
  const language = interfaceLanguage === "es" || interfaceLanguage === "en" ? interfaceLanguage : "fi";
  const t = copy[language];
  const [mode, setMode] = useState<"face" | "headphones" | "both">("both");
  const [output, setOutput] = useState<"both" | "text" | "audio">("both");
  const [starting, setStarting] = useState(false);
  const [listening, setListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState(false);
  const [receivedBytes, setReceivedBytes] = useState(0);
  const [audioConsent, setAudioConsent] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [liveError, setLiveError] = useState("");
  const [liveTranslatedText, setLiveTranslatedText] = useState("");
  const [liveTranslationNotice, setLiveTranslationNotice] = useState("");
  const [liveTranslating, setLiveTranslating] = useState(false);
  const [speechPlaybackPausesMic, setSpeechPlaybackPausesMic] = useState(false);
  const liveTranslationRequestRef = useRef(0);
  const liveTranslationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const partialTranscriptRef = useRef<{ itemId: string; text: string } | null>(null);
  const speechVoicesCacheRef = useRef<Partial<Record<SpeechLanguage, SpeechVoice[]>>>({});
  const [speaker, setSpeaker] = useState<"user" | "counterpart">("counterpart");
  const [draftText, setDraftText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translationNotice, setTranslationNotice] = useState("");
  const [translating, setTranslating] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage | null>(null);
  const [speechVoices, setSpeechVoices] = useState<SpeechVoice[]>([]);
  const [voiceGender, setVoiceGender] = useState<"FEMALE" | "MALE">("FEMALE");
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [speechError, setSpeechError] = useState("");
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const audioFileRef = useRef<File | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const bytesRef = useRef(0);
  const resamplerRef = useRef<Pcm16StreamResampler | null>(null);
  const resamplerConfigRef = useRef<{ sampleRate: number; channels: number } | null>(null);
  const socketRef = useRef<RealtimeTranscriptionSocket | null>(null);
  const speechFramesRef = useRef(0);
  const silenceFramesRef = useRef(0);
  const hasSpeechRef = useRef(false);
  const pausedForSpeechRef = useRef(false);
  const onBuffer = useCallback((buffer: { data: ArrayBuffer; sampleRate?: number; channels?: number }) => {
    const socket = socketRef.current;
    if (!socket) return;
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
      } else {
        resamplerRef.current = null;
        resamplerConfigRef.current = null;
      }
      if (pcm.byteLength === 0) return;
      bytesRef.current += pcm.byteLength;
      socket.appendAudio(pcm);
      if (isPcm16SpeechFrame(pcm)) {
        speechFramesRef.current += 1;
        silenceFramesRef.current = 0;
        hasSpeechRef.current = true;
      } else if (hasSpeechRef.current) {
        silenceFramesRef.current += 1;
        if (silenceFramesRef.current >= 18 && speechFramesRef.current >= 3) {
          socket.commitAudio();
          speechFramesRef.current = 0;
          silenceFramesRef.current = 0;
          hasSpeechRef.current = false;
        }
      }
    } catch {
      setLiveError(t.liveError);
    }
  }, [t.liveError]);
  const { stream } = useAudioStream({ channels: 1, encoding: "int16", sampleRate: REALTIME_AUDIO_SAMPLE_RATE, onBuffer });

  useEffect(() => () => {
    if (stream.isStreaming) stream.stop();
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

  async function translateRecognizedTurn(text: string, detected: string | undefined) {
    const requestId = liveTranslationRequestRef.current + 1;
    liveTranslationRequestRef.current = requestId;
    setLiveTranslatedText("");
    setLiveTranslationNotice("");
    setLiveTranslating(false);
    setSpeechError("");

    const direction = resolveInterpretationDirection(detected, userLanguage, counterpartLanguage);
    if (!direction) {
      setLiveTranslationNotice(t.directionUnknown);
      return;
    }
    if (!supabase) {
      setLiveTranslationNotice(t.signIn);
      return;
    }

    setLiveTranslating(true);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        setLiveTranslationNotice(t.signIn);
        return;
      }
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
      const apiUrl = baseUrl ? baseUrl + "/api/ai/translate" : typeof window !== "undefined" ? "/api/ai/translate" : "";
      if (!apiUrl) {
        setLiveTranslationNotice(t.server);
        return;
      }
      const response = await fetch(apiUrl, {
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
      const result = await response.json() as { translatedText?: string; error?: string };
      if (!response.ok || !result.translatedText) {
        if (response.status === 503) setLiveTranslationNotice(t.notConfigured);
        else if (response.status === 429) setLiveTranslationNotice(t.limit);
        else setLiveTranslationNotice(t.translationFailed);
        return;
      }
      if (requestId !== liveTranslationRequestRef.current) return;
      setLiveTranslatedText(result.translatedText);
      if (output !== "text") {
        const target = direction.targetLanguage;
        const savedPreference = loadLocalSpeechPreferences()[target];
        const gender = savedPreference?.gender ?? "FEMALE";
        let voices = speechVoicesCacheRef.current[target];
        if (!voices) {
          voices = await fetchSpeechVoices(
            target,
            data.session.access_token,
            process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
          );
          if (requestId === liveTranslationRequestRef.current) {
            speechVoicesCacheRef.current[target] = voices;
          }
        }
        const selected = savedPreference?.voiceName
          ? voices.find((voice) => voice.name === savedPreference.voiceName && voice.gender === gender)
          : voices.find((voice) => voice.gender === gender);
        if (requestId !== liveTranslationRequestRef.current) return;
        if (!selected) {
          setSpeechError(t.voiceUnavailable);
          return;
        }
        await playSpeech(result.translatedText, target, {
          voiceName: selected.name,
          gender,
        }, true);
      }
    } catch {
      if (requestId === liveTranslationRequestRef.current) {
        setLiveTranslationNotice(t.translationFailed);
      }
    } finally {
      if (requestId === liveTranslationRequestRef.current) setLiveTranslating(false);
    }
  }

  async function startListening() {
    if (!audioConsent || starting || listening) return;
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
    resamplerRef.current = null;
    resamplerConfigRef.current = null;
    setReceivedBytes(0);
    speechFramesRef.current = 0;
    silenceFramesRef.current = 0;
    hasSpeechRef.current = false;
    pausedForSpeechRef.current = false;
    setSpeechPlaybackPausesMic(false);
    speechVoicesCacheRef.current = {};
    liveTranslationQueueRef.current = Promise.resolve();
    try {
      if (!supabase) {
        setLiveError(t.signIn);
        return;
      }
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPermissionDenied(true);
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        setLiveError(t.signIn);
        return;
      }
      const session = await createRealtimeTranscriptionSession(
        data.session.access_token,
        process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
      );
      const socket = new RealtimeTranscriptionSocket(session.websocketUrl, session.clientSecret, {
        onTranscript: (transcript) => {
          if (transcript.stage === "partial") {
            const itemId = transcript.itemId ?? "current";
            const current = partialTranscriptRef.current;
            const nextText = current?.itemId === itemId
              ? current.text + transcript.transcript
              : transcript.transcript;
            partialTranscriptRef.current = { itemId, text: nextText };
            setLiveTranscript(nextText);
            return;
          }

          partialTranscriptRef.current = null;
          setLiveTranscript(transcript.transcript);
          setDetectedLanguage(transcript.detectedLanguage ?? "");
          liveTranslationQueueRef.current = liveTranslationQueueRef.current
            .then(() => translateRecognizedTurn(transcript.transcript, transcript.detectedLanguage))
            .catch(() => undefined);
        },
        onError: () => setLiveError(t.liveError),
        onClose: () => {
          if (!socketRef.current) return;
          socketRef.current = null;
          if (stream.isStreaming) stream.stop();
          void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
          pausedForSpeechRef.current = false;
          setSpeechPlaybackPausesMic(false);
          setListening(false);
        },
      });
      socketRef.current = socket;
      await socket.connect();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await stream.start();
      setListening(true);
    } catch {
      socketRef.current?.close();
      socketRef.current = null;
      setError(true);
      setLiveError(t.liveError);
      if (stream.isStreaming) stream.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    } finally {
      setStarting(false);
    }
  }

  async function stopListening() {
    if (stream.isStreaming) stream.stop();
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
    setListening(false);
    setReceivedBytes(bytesRef.current);
    // Give the provider a short window to return the final committed transcript.
    await socket?.flushAndClose(2_000, shouldCommit);
  }

  async function translateDraft() {
    const text = draftText.trim();
    if (!text || translating) return;
    if (!supabase) {
      setTranslationNotice(t.signIn);
      return;
    }
    setTranslating(true);
    setTranslationNotice("");
    setTranslatedText("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        setTranslationNotice(t.signIn);
        return;
      }
      const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
      const apiUrl = configuredBase ? configuredBase + "/api/ai/translate" : typeof window !== "undefined" ? "/api/ai/translate" : "";
      if (!apiUrl) {
        setTranslationNotice(t.server);
        return;
      }
      const sourceLanguage = speaker === "counterpart" ? counterpartLanguage : userLanguage;
      const targetLanguage = speaker === "counterpart" ? userLanguage : counterpartLanguage;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token },
        body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
      });
      const result = await response.json() as { translatedText?: string; error?: string };
      if (!response.ok || !result.translatedText) {
        if (response.status === 503) setTranslationNotice(t.notConfigured);
        else if (response.status === 429) setTranslationNotice(t.limit);
        else setTranslationNotice(t.translationFailed);
        return;
      }
      setTranslatedText(result.translatedText);
      if (output !== "text" && speechLanguage) await playSpeech(result.translatedText, speechLanguage);
    } catch {
      setTranslationNotice(t.translationFailed);
    } finally {
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
    const activeLanguage: SpeechLanguage = language;
    async function loadVoices() {
      if (!supabase) {
        setVoiceNotice(t.signIn);
        return;
      }
      setVoiceLoading(true);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.access_token) {
          if (active) setVoiceNotice(t.signIn);
          return;
        }
        const voices = await fetchSpeechVoices(
          activeLanguage,
          data.session.access_token,
          process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
        );
        if (!active) return;
        setSpeechVoices(voices);
        const saved = loadLocalSpeechPreferences()[activeLanguage];
        const preferredGender = saved?.gender ?? "FEMALE";
        const matching = voices.filter((voice) => voice.gender === preferredGender);
        if (!matching.length) {
          setVoiceNotice(t.voiceUnavailable);
          return;
        }
        const selected = matching.find((voice) => voice.name === saved?.voiceName) ?? matching[0];
        setVoiceGender(preferredGender);
        setSelectedVoiceName(selected.name);
      } catch {
        if (active) setVoiceNotice(t.voiceError);
      } finally {
        if (active) setVoiceLoading(false);
      }
    }
    void loadVoices();
    return () => { active = false; };
  }, [targetLanguage, t.signIn, t.voiceError, t.voiceUnavailable]);

  useEffect(() => {
    if (!playerStatus.didJustFinish) return;
    if (audioFileRef.current) {
      audioFileRef.current.delete();
      audioFileRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (pausedForSpeechRef.current) void resumeLiveCapture();
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

  function persistVoicePreference(language: SpeechLanguage, gender: "FEMALE" | "MALE", voiceName: string) {
    const current = loadLocalSpeechPreferences();
    saveLocalSpeechPreferences({ ...current, [language]: { gender, voiceName } });
  }

  function chooseVoiceGender(gender: "FEMALE" | "MALE") {
    if (!speechLanguage) return;
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

  function chooseVoice(voiceName: string) {
    if (!speechLanguage) return;
    setSelectedVoiceName(voiceName);
    persistVoicePreference(speechLanguage, voiceGender, voiceName);
  }

  async function resumeLiveCapture() {
    if (!pausedForSpeechRef.current) return;
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
    } catch {
      pausedForSpeechRef.current = false;
      setSpeechPlaybackPausesMic(false);
      setLiveError(t.liveError);
      stopListening();
    }
  }

  async function playSpeech(
    text: string,
    language: SpeechLanguage,
    voiceOverride?: { voiceName: string; gender: "FEMALE" | "MALE" },
    pauseCaptureForPlayback = false,
  ) {
    const voiceName = voiceOverride?.voiceName ?? selectedVoiceName;
    const gender = voiceOverride?.gender ?? voiceGender;
    if (!voiceName || !supabase) {
      setSpeechError(t.signIn);
      return;
    }
    setSpeechError("");
    try {
      if (socketRef.current && pauseCaptureForPlayback) {
        if (stream.isStreaming) stream.stop();
        pausedForSpeechRef.current = true;
        setSpeechPlaybackPausesMic(true);
      } else if (socketRef.current) {
        stopListening();
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        setSpeechError(t.signIn);
        if (pausedForSpeechRef.current) await resumeLiveCapture();
        return;
      }
      const audioContent = await synthesizeSpeech(
        text,
        language,
        voiceName,
        gender,
        data.session.access_token,
        process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
      );
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
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
        audioUrlRef.current = url;
        player.replace(url);
      } else {
        const file = new File(Paths.cache, "elovio-speech-" + Date.now() + ".mp3");
        await file.write(audioContent, { encoding: "base64" });
        audioFileRef.current = file;
        player.replace(file.uri);
      }
      player.play();
    } catch {
      if (audioFileRef.current) {
        audioFileRef.current.delete();
        audioFileRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      setSpeechError(t.speechError);
      if (pausedForSpeechRef.current) await resumeLiveCapture();
    }
  }

  const languageName = (code: string) => code === "fi" ? "Suomi" : code === "es" ? "Español" : code === "en" ? "English" : code;
  const selected = (active: boolean) => [styles.option, active && styles.optionSelected];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
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
            {(["face", "headphones", "both"] as const).map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: mode === item }} onPress={() => setMode(item)} style={selected(mode === item)}>
                <Text style={styles.optionText}>{item === "face" ? t.face : item === "headphones" ? t.headphones : t.both}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{t.output}</Text>
          <View style={styles.options}>
            {(["both", "text", "audio"] as const).map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: output === item }} onPress={() => setOutput(item)} style={selected(output === item)}>
                <Text style={styles.optionText}>{item === "both" ? t.textAudio : item === "text" ? t.text : t.audio}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>{t.history}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t.translateTitle}</Text>
          <Text style={styles.note}>{t.translateIntro}</Text>
          <View style={styles.options}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: speaker === "counterpart" }} onPress={() => { setSpeaker("counterpart"); setTranslatedText(""); }} style={selected(speaker === "counterpart")}>
              <Text style={styles.optionText}>{t.theySpeak}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: speaker === "user" }} onPress={() => { setSpeaker("user"); setTranslatedText(""); }} style={selected(speaker === "user")}>
              <Text style={styles.optionText}>{t.iSpeak}</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>{t.source}: {languageName(speaker === "counterpart" ? counterpartLanguage : userLanguage)} · {t.target}: {languageName(speaker === "counterpart" ? userLanguage : counterpartLanguage)}</Text>
          <Text style={styles.label}>{t.voiceTitle}</Text>
          {voiceLoading ? <ActivityIndicator color="#315D4C" /> : (
            <>
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
                {speechVoices.filter((voice) => voice.gender === voiceGender).map((voice) => (
                  <Pressable key={voice.name} accessibilityRole="button" accessibilityState={{ selected: selectedVoiceName === voice.name }} onPress={() => chooseVoice(voice.name)} style={selected(selectedVoiceName === voice.name)}>
                    <Text style={styles.optionText}>{voice.name.split("-").slice(-1)[0]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable accessibilityRole="button" disabled={!selectedVoiceName || playerStatus.playing} onPress={() => {
                const sample = speechLanguage === "fi" ? "Hei! Mukava tavata." : speechLanguage === "es" ? "¡Hola! Qué gusto conocerte." : "Hello! Nice to meet you.";
                if (speechLanguage) void playSpeech(sample, speechLanguage);
              }} style={[styles.action, (!selectedVoiceName || playerStatus.playing) && styles.disabled]}>
                <Text style={styles.actionText}>{playerStatus.playing ? t.speaking : t.voicePreview}</Text>
              </Pressable>
            </>
          )}
          {!!voiceNotice && <Text accessibilityRole="alert" style={styles.error}>{voiceNotice}</Text>}
          {!!speechError && <Text accessibilityRole="alert" style={styles.error}>{speechError}</Text>}
          <TextInput accessibilityLabel={t.textPlaceholder} editable={!translating} multiline maxLength={4000} onChangeText={(value) => { setDraftText(value); setTranslatedText(""); }} placeholder={t.textPlaceholder} placeholderTextColor="#78877D" style={styles.translationInput} value={draftText} />
          <Pressable accessibilityRole="button" disabled={translating || !draftText.trim()} onPress={translateDraft} style={[styles.action, (translating || !draftText.trim()) && styles.disabled]}>
            {translating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionText}>{t.translate}</Text>}
          </Pressable>
          {!!translationNotice && <Text accessibilityRole="alert" style={styles.error}>{translationNotice}</Text>}
          {!!translatedText && output !== "audio" && (
            <View style={styles.translationResult}>
              <Text style={styles.label}>{t.original}</Text>
              <Text style={styles.resultText}>{draftText.trim()}</Text>
              <Text style={styles.label}>{t.translated}</Text>
              <Text accessibilityLiveRegion="polite" style={styles.resultText}>{translatedText}</Text>
            </View>
          )}
        </View>

        <View style={styles.micCard}>
          <View style={styles.micIcon}><Text style={styles.micGlyph}>◉</Text></View>
          <Text style={styles.micTitle}>{starting ? t.connecting : speechPlaybackPausesMic ? t.speaking : listening ? t.listening : t.start}</Text>
          <Text style={styles.body}>{listening ? t.ready : t.privacy}</Text>
          {!listening && (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: audioConsent }} onPress={() => setAudioConsent((value) => !value)} style={styles.consent}>
              <Text style={styles.consentText}>{audioConsent ? "☑" : "□"}  {t.consent}</Text>
            </Pressable>
          )}
          {starting ? <ActivityIndicator color="#315D4C" /> : (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !listening && !audioConsent }} disabled={!listening && !audioConsent} onPress={listening ? stopListening : startListening} style={[styles.action, listening && styles.stopAction, !listening && !audioConsent && styles.disabled]}>
              <Text style={styles.actionText}>{listening ? t.stop : t.start}</Text>
            </Pressable>
          )}
          {permissionDenied && <Text accessibilityRole="alert" style={styles.error}>{t.denied}</Text>}
          {error && <Text accessibilityRole="alert" style={styles.error}>{t.error}</Text>}
          {listening && <Text style={styles.note}>{speechPlaybackPausesMic ? t.playbackPaused : t.ready}</Text>}
          {!!liveError && <Text accessibilityRole="alert" style={styles.error}>{liveError}</Text>}
          {output !== "audio" && !!liveTranscript && (
            <View style={styles.translationResult}>
              <Text style={styles.label}>{t.transcriptTitle}</Text>
              {!!detectedLanguage && <Text style={styles.note}>{t.detected}: {languageName(detectedLanguage)}</Text>}
              <Text accessibilityLiveRegion="polite" style={styles.resultText}>{liveTranscript}</Text>
              {liveTranslating && <ActivityIndicator color="#315D4C" />}
              {!!liveTranslationNotice && <Text accessibilityRole="alert" style={styles.error}>{liveTranslationNotice}</Text>}
              {!!liveTranslatedText && (
                <>
                  <Text style={styles.label}>{t.liveTranslation}</Text>
                  <Text accessibilityLiveRegion="polite" style={styles.resultText}>{liveTranslatedText}</Text>
                </>
              )}
            </View>
          )}
          {output !== "audio" && !liveTranscript && <Text style={styles.note}>{t.transcriptEmpty}</Text>}
          {!listening && receivedBytes > 0 && <Text style={styles.note}>{t.captured}: {Math.round(receivedBytes / 1024)} KB · 24 kHz PCM</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F6F1" },
  content: { padding: 22, paddingBottom: 44, gap: 18 },
  back: { alignSelf: "flex-start", paddingVertical: 8 },
  backText: { color: "#315D4C", fontSize: 14, fontWeight: "700" },
  heading: { gap: 8, paddingVertical: 8 },
  eyebrow: { color: "#64736B", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#183D32", fontSize: 28, fontWeight: "700" },
  body: { color: "#52645B", fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E9E2", borderRadius: 16, padding: 16, gap: 10 },
  label: { color: "#78877D", fontSize: 10, fontWeight: "700", letterSpacing: 1.3, marginTop: 4 },
  value: { color: "#183D32", fontSize: 15, fontWeight: "600" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1, borderColor: "#D8DED7", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 },
  optionSelected: { borderColor: "#315D4C", backgroundColor: "#EAF0E9" },
  optionText: { color: "#29483D", fontSize: 12, fontWeight: "600" },
  translationInput: { minHeight: 90, maxHeight: 180, borderWidth: 1, borderColor: "#D8DED7", borderRadius: 12, padding: 12, color: "#183D32", textAlignVertical: "top" },
  translationResult: { borderTopWidth: 1, borderTopColor: "#E7E9E2", paddingTop: 12, gap: 7 },
  voiceOptions: { gap: 8, paddingVertical: 4 },
  resultText: { color: "#244338", fontSize: 15, lineHeight: 22 },
  disabled: { opacity: 0.45 },
  note: { color: "#7A877F", fontSize: 12, lineHeight: 18 },
  consent: { alignSelf: "stretch", paddingVertical: 10 },
  consentText: { color: "#52645B", fontSize: 13, lineHeight: 19 },
  micCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE5DC", borderRadius: 20, padding: 20, alignItems: "center", gap: 12 },
  micIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#EAF0E9", alignItems: "center", justifyContent: "center" },
  micGlyph: { color: "#244E3E", fontSize: 30 },
  micTitle: { color: "#183D32", fontSize: 17, fontWeight: "700", textAlign: "center" },
  action: { minHeight: 50, alignSelf: "stretch", borderRadius: 12, backgroundColor: "#244E3E", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  stopAction: { backgroundColor: "#7B3E3E" },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  error: { color: "#9A3535", fontSize: 13, textAlign: "center" },
});
