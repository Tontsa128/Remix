/**
 * Elovio Translation & Speech Engine
 * Provides trilingual translation, language detection, robust Web Speech API
 * speech recognition, audio level monitoring, and natural browser voice synthesis.
 */

// Expanded phrase and vocabulary pairs across all everyday situations
const PHRASE_DICTIONARY = [
  // Greetings & Courtesies
  { fi: "hei", es: "hola", en: "hello" },
  { fi: "moi", es: "hola", en: "hi" },
  { fi: "terve", es: "hola", en: "hello" },
  { fi: "hyvää huomenta", es: "buenos días", en: "good morning" },
  { fi: "hyvää päivää", es: "buenas tardes", en: "good day" },
  { fi: "hyvää iltaa", es: "buenas noches", en: "good evening" },
  { fi: "hyvää yötä", es: "buenas noches", en: "good night" },
  { fi: "näkemiin", es: "adiós", en: "goodbye" },
  { fi: "nähdään myöhemmin", es: "hasta luego", en: "see you later" },
  { fi: "nähdään huomenna", es: "hasta mañana", en: "see you tomorrow" },
  { fi: "kiitos", es: "gracias", en: "thank you" },
  { fi: "paljon kiitoksia", es: "muchas gracias", en: "thank you very much" },
  { fi: "ole hyvä", es: "de nada", en: "you're welcome" },
  { fi: "ei kestä", es: "de nada", en: "no problem" },
  { fi: "anteeksi", es: "disculpe", en: "excuse me" },
  { fi: "olen pahoillani", es: "lo siento", en: "i am sorry" },
  { fi: "mitä kuuluu", es: "¿cómo estás?", en: "how are you?" },
  { fi: "mitä kuuluu?", es: "¿cómo estás?", en: "how are you?" },
  { fi: "kuinka voit?", es: "¿cómo estás?", en: "how are you doing?" },
  { fi: "kiitos hyvää", es: "muy bien, gracias", en: "very well, thank you" },
  { fi: "hyvää", es: "bien", en: "good" },
  { fi: "entä sinulle?", es: "¿y tú?", en: "and you?" },
  { fi: "minun nimeni on", es: "mi nombre es", en: "my name is" },
  { fi: "mikä sinun nimesi on?", es: "¿cómo te llamas?", en: "what is your name?" },
  { fi: "hauska tutustua", es: "mucho gusto", en: "nice to meet you" },
  { fi: "kyllä", es: "sí", en: "yes" },
  { fi: "ei", es: "no", en: "no" },
  { fi: "ehkä", es: "tal vez", en: "maybe" },
  { fi: "tottakai", es: "por supuesto", en: "of course" },

  // Cafe & Food & Drinks
  { fi: "yksi kahvi kiitos", es: "un café por favor", en: "one coffee please" },
  { fi: "kaksi kahvia kiitos", es: "dos cafés por favor", en: "two coffees please" },
  { fi: "kahvi maidolla", es: "café con leche", en: "coffee with milk" },
  { fi: "musta kahvi", es: "café solo", en: "black coffee" },
  { fi: "espresso", es: "un café espresso", en: "an espresso" },
  { fi: "tee", es: "té", en: "tea" },
  { fi: "vesi", es: "agua", en: "water" },
  { fi: "lasi vettä", es: "un vaso de agua", en: "a glass of water" },
  { fi: "kivennäisvesi", es: "agua con gas", en: "sparkling water" },
  { fi: "maito", es: "leche", en: "milk" },
  { fi: "sokeri", es: "azúcar", en: "sugar" },
  { fi: "leipä", es: "pan", en: "bread" },
  { fi: "croissant", es: "un cruasán", en: "a croissant" },
  { fi: "voileipä", es: "un bocadillo", en: "a sandwich" },
  { fi: "omena", es: "manzana", en: "apple" },
  { fi: "punainen omena", es: "manzana roja", en: "red apple" },
  { fi: "lasku kiitos", es: "la cuenta por favor", en: "the bill please" },
  { fi: "paljonko tämä maksaa?", es: "¿cuánto cuesta esto?", en: "how much is this?" },
  { fi: "paljonko maksaa", es: "¿cuánto cuesta?", en: "how much does it cost?" },
  { fi: "maksanko kortilla vai käteisellä?", es: "¿pago con tarjeta o en efectivo?", en: "do i pay by card or cash?" },
  { fi: "maksan kortilla", es: "pago con tarjeta", en: "i pay by card" },
  { fi: "maksan käteisellä", es: "pago en efectivo", en: "i pay in cash" },
  { fi: "haluaisin tilata", es: "quisiera pedir", en: "i would like to order" },
  { fi: "mitä suosittelet?", es: "¿qué me recomienda?", en: "what do you recommend?" },
  { fi: "hyvää ruokahalua", es: "buen provecho", en: "enjoy your meal" },

  // Directions & Movement
  { fi: "anteeksi, missä on", es: "disculpe, ¿dónde está?", en: "excuse me, where is?" },
  { fi: "missä on", es: "¿dónde está?", en: "where is?" },
  { fi: "missä on vessa?", es: "¿dónde está el baño?", en: "where is the bathroom?" },
  { fi: "missä on lähin apteekki?", es: "¿dónde está la farmacia más cercana?", en: "where is the nearest pharmacy?" },
  { fi: "missä on lähin pysäkki?", es: "¿dónde está la parada más cercana?", en: "where is the nearest stop?" },
  { fi: "missä on rautatieasema?", es: "¿dónde está la estación de tren?", en: "where is the train station?" },
  { fi: "missä on metroasema?", es: "¿dónde está la estación de metro?", en: "where is the metro station?" },
  { fi: "missä on lentokenttä?", es: "¿dónde está el aeropuerto?", en: "where is the airport?" },
  { fi: "missä on keskusta?", es: "¿dónde está el centro?", en: "where is the center?" },
  { fi: "käänny vasemmalle", es: "gire a la izquierda", en: "turn left" },
  { fi: "käänny oikealle", es: "gire a la derecha", en: "turn right" },
  { fi: "mene suoraan", es: "siga todo recto", en: "go straight ahead" },
  { fi: "se on vasemmalla", es: "está a la izquierda", en: "it is on the left" },
  { fi: "se on oikealla", es: "está a la derecha", en: "it is on the right" },
  { fi: "se on lähellä", es: "está muy cerca", en: "it is very close" },
  { fi: "se on kaukana", es: "está lejos", en: "it is far away" },
  { fi: "kulman takana", es: "a la vuelta de la esquina", en: "around the corner" },

  // Travel & Transport
  { fi: "bussi", es: "el autobús", en: "the bus" },
  { fi: "juna", es: "el tren", en: "the train" },
  { fi: "taksi", es: "el taxi", en: "the taxi" },
  { fi: "lippu", es: "un billete", en: "a ticket" },
  { fi: "yksi lippu kiitos", es: "un billete por favor", en: "one ticket please" },
  { fi: "kaksi lippua kiitos", es: "dos billetes por favor", en: "two tickets please" },
  { fi: "mihin aikaan bussi lähtee?", es: "¿a qué hora sale el autobús?", en: "what time does the bus leave?" },
  { fi: "meneekö tämä bussi keskustaan?", es: "¿este autobús va al centro?", en: "does this bus go to the center?" },
  { fi: "monelta juna saapuu?", es: "¿a qué hora llega el tren?", en: "what time does the train arrive?" },
  { fi: "hyvää matkaa", es: "buen viaje", en: "have a good trip" },

  // Hotel & Accommodation
  { fi: "minulla on varaus", es: "tengo una reserva", en: "i have a reservation" },
  { fi: "haluan kirjautua sisään", es: "quisiera registrarme", en: "i would like to check in" },
  { fi: "haluan kirjautua ulos", es: "quisiera hacer el check-out", en: "i would like to check out" },
  { fi: "onko teillä vapaita huoneita?", es: "¿tienen habitaciones libres?", en: "do you have free rooms?" },
  { fi: "tässä on avain", es: "aquí tiene la llave", en: "here is the key" },
  { fi: "huone numero", es: "habitación número", en: "room number" },
  { fi: "mihin aikaan aamiainen on?", es: "¿a qué hora se sirve el desayuno?", en: "what time is breakfast served?" },
  { fi: "mikä on wifi-salasana?", es: "¿cuál es la contraseña del wifi?", en: "what is the wifi password?" },

  // Doctor & Emergency & Health
  { fi: "tarvitsen apua", es: "necesito ayuda", en: "i need help" },
  { fi: "apua!", es: "¡ayuda!", en: "help!" },
  { fi: "soittakaa ambulanssi", es: "llamen a una ambulancia", en: "call an ambulance" },
  { fi: "soittakaa poliisi", es: "llamen a la policía", en: "call the police" },
  { fi: "olen sairas", es: "estoy enfermo", en: "i am sick" },
  { fi: "minulla on kuumetta", es: "tengo fiebre", en: "i have a fever" },
  { fi: "päätäni särkee", es: "me duele la cabeza", en: "i have a headache" },
  { fi: "kurkkuni on kipeä", es: "me duele la garganta", en: "my throat hurts" },
  { fi: "vatsaani koskee", es: "me duele el estómago", en: "my stomach hurts" },
  { fi: "tarvitsen lääkäriä", es: "necesito ver a un médico", en: "i need to see a doctor" },
  { fi: "missä on sairaala?", es: "¿dónde está el hospital?", en: "where is the hospital?" },
  { fi: "missä on apteekki?", es: "¿dónde hay una farmacia?", en: "where is a pharmacy?" },
  { fi: "onko teillä särkylääkettä?", es: "¿tiene analgésicos?", en: "do you have painkillers?" },
  { fi: "olen allerginen", es: "soy alérgico", en: "i am allergic" },

  // Language & Understanding
  { fi: "puhutko suomea?", es: "¿hablas finés?", en: "do you speak finnish?" },
  { fi: "puhutko espanjaa?", es: "¿hablas español?", en: "do you speak spanish?" },
  { fi: "puhutko englantia?", es: "¿hablas inglés?", en: "do you speak english?" },
  { fi: "en puhu paljon espanjaa", es: "no hablo mucho español", en: "i don't speak much spanish" },
  { fi: "en ymmärrä", es: "no entiendo", en: "i do not understand" },
  { fi: "ymmärrän", es: "entiendo perfectamente", en: "i understand" },
  { fi: "voitko toistaa?", es: "¿puedes repetirlo por favor?", en: "can you repeat that please?" },
  { fi: "puhu hitaammin kiitos", es: "hable más despacio por favor", en: "please speak slower" },
  { fi: "mitä tämä tarkoittaa?", es: "¿qué significa esto?", en: "what does this mean?" },
  { fi: "miten sanotaan espanjaksi", es: "¿cómo se dice en español?", en: "how do you say in spanish?" },

  // Shopping & Everyday
  { fi: "haluan ostaa tämän", es: "quiero comprar esto", en: "i want to buy this" },
  { fi: "onko teillä pienempää kokoa?", es: "¿tienen una talla más pequeña?", en: "do you have a smaller size?" },
  { fi: "onko teillä suurempaa kokoa?", es: "¿tienen una talla más grande?", en: "do you have a larger size?" },
  { fi: "missä sovituskopit ovat?", es: "¿dónde están los probadores?", en: "where are the fitting rooms?" },
  { fi: "tämä on liian kallis", es: "esto es demasiado caro", en: "this is too expensive" },
  { fi: "onko alennusta?", es: "¿hay algún descuento?", en: "is there a discount?" },
  { fi: "kuitin kiitos", es: "el recibo por favor", en: "the receipt please" },
  { fi: "hyvää päivänjatkoa", es: "¡que tenga un buen día!", en: "have a nice day!" },
];

/**
 * Normalizes text for matching
 */
function clean(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'¡¿]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Checks if the Web Speech Recognition API is supported in the current environment
 */
export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Checks current microphone permission state without triggering a prompt
 * Returns 'granted' | 'denied' | 'prompt' | 'unknown'
 */
export async function getMicrophonePermissionState() {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    return status?.state || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Unlocks Web Speech Synthesis on mobile Safari/Chrome synchronously during a user tap
 */
export function unlockBrowserSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.getVoices();
    const primer = new SpeechSynthesisUtterance(" ");
    primer.volume = 0;
    primer.rate = 10;
    window.speechSynthesis.speak(primer);
  } catch {
    // Ignore unlock failures on restricted browsers
  }
}

/**
 * Asks for microphone permission using getUserMedia (triggers native OS/browser prompt)
 */
export async function requestMicrophonePermission() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { granted: false, error: "MediaDevices not supported", isDenied: false };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return { granted: true, stream, isDenied: false };
  } catch (err) {
    // Fallback to plain audio constraint in case device rejects optional constraints
    if (err?.name === "OverconstrainedError" || err?.name === "ConstraintNotSatisfiedError") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return { granted: true, stream, isDenied: false };
      } catch (fallbackErr) {
        const name = fallbackErr?.name || "PermissionDenied";
        return {
          granted: false,
          error: name,
          isDenied: name === "NotAllowedError" || name === "PermissionDeniedError" || name === "PermissionDenied",
        };
      }
    }
    const name = err?.name || "PermissionDenied";
    return {
      granted: false,
      error: name,
      isDenied: name === "NotAllowedError" || name === "PermissionDeniedError" || name === "PermissionDenied",
    };
  }
}

/**
 * Creates an audio level monitor from a MediaStream to display live VU meters/waves
 */
export function createAudioLevelMonitor(stream, onLevel) {
  if (typeof window === "undefined" || !stream) return { stop: () => {} };
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return { stop: () => {} };

    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.5;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animId = null;

    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalized = Math.min(100, Math.round((average / 128) * 100));
      onLevel(normalized);
      animId = requestAnimationFrame(update);
    };

    update();

    return {
      stop: () => {
        if (animId) cancelAnimationFrame(animId);
        try { source.disconnect(); } catch {}
        try { audioCtx.close(); } catch {}
      },
    };
  } catch (err) {
    console.warn("Audio monitor setup failed:", err);
    return { stop: () => {} };
  }
}

/**
 * Detect language between candidates (defaults to fi, es, en)
 */
export function detectLanguage(text, langA = 'fi', langB = 'es') {
  if (!text || !text.trim()) return langA;
  const raw = text.toLowerCase();

  // Spanish markers
  const spanishMarkers = /[¿¡ñáéíóú]/i;
  const spanishWords = [
    'hola', 'gracias', 'buenos', 'buenas', 'dias', 'tardes', 'noches',
    'por', 'favor', 'como', 'donde', 'que', 'este', 'esta', 'tengo',
    'puedo', 'café', 'quiero', 'bien', 'si', 'estoy', 'usted', 'tu'
  ];

  // Finnish markers
  const finnishMarkers = /[äö]/i;
  const finnishWords = [
    'hei', 'moi', 'terve', 'kiitos', 'ole', 'hyvää', 'huomenta', 'päivää',
    'mitä', 'missä', 'onko', 'kyllä', 'tämä', 'haluan', 'minä', 'sinä',
    'kahvi', 'yksi', 'kaksi', 'paljonko', 'anteeksi'
  ];

  const englishWords = [
    'hello', 'hi', 'thank', 'you', 'please', 'where', 'what', 'how',
    'good', 'morning', 'would', 'like', 'the', 'this', 'have', 'need'
  ];

  let scoreFi = 0;
  let scoreEs = 0;
  let scoreEn = 0;

  if (finnishMarkers.test(raw)) scoreFi += 5;
  if (spanishMarkers.test(raw)) scoreEs += 5;

  const words = raw.split(/\s+/);
  for (const w of words) {
    const c = clean(w);
    if (finnishWords.includes(c)) scoreFi += 2;
    if (spanishWords.includes(c)) scoreEs += 2;
    if (englishWords.includes(c)) scoreEn += 2;
  }

  const scores = [
    { lang: 'fi', score: scoreFi },
    { lang: 'es', score: scoreEs },
    { lang: 'en', score: scoreEn },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    if (scores[0].lang === langA || scores[0].lang === langB) {
      return scores[0].lang;
    }
    return scores[0].lang;
  }

  return langA;
}

/**
 * Translates a text string between fi, es, en
 */
export async function translateText(text, sourceLang, targetLang) {
  if (!text || !text.trim()) return "";
  const trimmed = text.trim();
  const sLang = sourceLang || 'fi';
  const tLang = targetLang || 'es';

  if (sLang === tLang) return trimmed;

  // 1. Direct dictionary match
  const cleaned = clean(trimmed);
  const match = PHRASE_DICTIONARY.find(
    (item) => clean(item[sLang]) === cleaned
  );
  if (match && match[tLang]) {
    const res = match[tLang];
    return trimmed[0] === trimmed[0].toUpperCase()
      ? res.charAt(0).toUpperCase() + res.slice(1)
      : res;
  }

  // 2. Subphrase / partial matching
  for (const item of PHRASE_DICTIONARY) {
    const itemClean = clean(item[sLang]);
    if (itemClean.length > 4 && cleaned.includes(itemClean)) {
      const regex = new RegExp(itemClean, 'gi');
      const replaced = cleaned.replace(regex, item[tLang]);
      return replaced.charAt(0).toUpperCase() + replaced.slice(1);
    }
  }

  // 3. Word-by-word dictionary fallback
  const words = trimmed.split(' ');
  const translatedWords = words.map((w) => {
    const cw = clean(w);
    const m = PHRASE_DICTIONARY.find((item) => clean(item[sLang]) === cw);
    return m && m[tLang] ? m[tLang] : w;
  });

  const combined = translatedWords.join(' ');
  if (combined.toLowerCase() !== trimmed.toLowerCase()) {
    return combined.charAt(0).toUpperCase() + combined.slice(1);
  }

  // 4. Try backend AI translation API proxy if available
  try {
    const res = await fetch('/api/public/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, sourceLanguage: sLang, targetLanguage: tLang }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.translatedText) {
        return data.translatedText;
      }
    }
  } catch {
    // Graceful offline fallback
  }

  return trimmed;
}

/**
 * Browser Speech Synthesis (TTS) with natural voice selection and playback lifecycle callbacks
 */
export function speakBrowserText(text, lang, callbacks = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return false;
  const { onStart, onEnd } = callbacks || {};
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langCodeMap = {
      fi: "fi-FI",
      es: "es-ES",
      en: "en-US",
    };
    utterance.lang = langCodeMap[lang] || "es-ES";
    utterance.rate = 0.94;
    utterance.pitch = 1.0;

    // Pick a matching natural voice
    const voices = window.speechSynthesis.getVoices();
    const matching = voices.filter((v) => v.lang.toLowerCase().startsWith((lang || "").toLowerCase()));
    if (matching.length > 0) {
      utterance.voice = matching[0];
    }

    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      if (onEnd) onEnd();
    };

    utterance.onstart = () => {
      if (onStart) onStart();
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    // Safety timer in case mobile WebView/browser drops onend
    const estimatedMs = Math.max(1800, Math.min(12000, text.length * 85 + 900));
    setTimeout(finish, estimatedMs);

    if (onStart) onStart();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("Speech synthesis notice:", err);
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Browser Speech Recognition (STT) via Web Speech API with mobile-safe auto-reconnection
 */
export function startBrowserRecognition({ lang, onResult, onError, onEnd, onStateChange }) {
  if (typeof window === "undefined") return null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/i.test(navigator.userAgent || "");
  let shouldRun = true;
  let muted = false;
  let activeRecognizer = null;
  let currentLang = lang || 'fi';
  let hasStarted = false;
  let consecutiveErrors = 0;
  let restartTimer = null;

  const langCodeMap = {
    fi: "fi-FI",
    es: "es-ES",
    en: "en-US",
  };

  const createAndStart = () => {
    if (!shouldRun) return;
    try {
      const recognizer = new SpeechRecognition();
      recognizer.lang = langCodeMap[currentLang] || "fi-FI";
      recognizer.continuous = !isIOS;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 1;

      recognizer.onstart = () => {
        hasStarted = true;
        consecutiveErrors = 0;
        if (onStateChange) onStateChange("listening");
      };

      recognizer.onresult = (event) => {
        if (muted) return;
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (onResult && (final.trim() || interim.trim())) {
          onResult({ final: final.trim(), interim: interim.trim() });
        }
      };

      recognizer.onerror = (e) => {
        const errCode = e?.error || "unknown";
        console.warn("Speech recognition notice:", errCode);
        if (errCode === "not-allowed" || errCode === "service-not-allowed") {
          shouldRun = false;
          if (onError) onError(e);
          if (onStateChange) onStateChange("error", e);
        } else if (errCode === "no-speech" || errCode === "aborted") {
          // Normal pause or intentional restart
        } else if (errCode === "audio-capture") {
          consecutiveErrors += 1;
          if (!hasStarted || consecutiveErrors >= 3) {
            shouldRun = false;
            if (onError) onError(e);
            if (onStateChange) onStateChange("error", e);
          }
        } else {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 4) {
            shouldRun = false;
            if (onError) onError(e);
            if (onStateChange) onStateChange("error", e);
          }
        }
      };

      recognizer.onend = () => {
        if (activeRecognizer === recognizer) {
          activeRecognizer = null;
        }
        if (shouldRun) {
          if (restartTimer) clearTimeout(restartTimer);
          restartTimer = setTimeout(() => {
            if (shouldRun) createAndStart();
          }, 220);
        } else {
          if (onStateChange) onStateChange("stopped");
          if (onEnd) onEnd();
        }
      };

      activeRecognizer = recognizer;
      recognizer.start();
    } catch (err) {
      console.warn("Error starting speech recognition:", err);
      shouldRun = false;
      if (onError) onError(err);
      if (onStateChange) onStateChange("error", err);
    }
  };

  createAndStart();

  return {
    stop: () => {
      shouldRun = false;
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
      if (activeRecognizer) {
        try { activeRecognizer.stop(); } catch {}
        activeRecognizer = null;
      }
      if (onStateChange) onStateChange("stopped");
    },
    setLang: (newLang) => {
      currentLang = newLang;
      if (activeRecognizer) {
        try { activeRecognizer.stop(); } catch {}
      }
    },
    setMuted: (nextMuted) => {
      muted = Boolean(nextMuted);
    },
    isRunning: () => shouldRun,
  };
}

export { PHRASE_DICTIONARY };
