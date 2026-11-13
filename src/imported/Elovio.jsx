import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LANGUAGES } from "./config/languages.js";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";
import {
  getActiveSession,
  signInWithGoogle,
  signInWithEmailPassword,
  signOut as authSignOut,
  DEFAULT_GOOGLE_USER,
} from "../lib/auth-service.js";
import { loadLanguagePreferences, saveLanguagePreferences } from "./services/language-preferences.js";
import { loadLocalLanguagePreferences, saveLocalLanguagePreferences } from "./services/local-language-preferences.js";
import { getTranslations } from "./i18n/translations.js";
import { StarterLesson } from "./features/learning/StarterLesson.jsx";
import { VisualVocabulary } from "./features/learning/VisualVocabulary.jsx";
import { loadLocalLearningProfile, saveLocalLearningProfile } from "./services/local-learning-profile.js";
import { loadLocalLearningProgress } from "./services/local-learning-progress.js";
import { getDuePhraseIds } from "./services/spaced-repetition.js";
import { getStudySummary, loadStudyDays } from "./services/local-learning-activity.js";
import { getLearningLevel } from "./services/learning-levels.js";
import { getLearningGoalProgress } from "./services/learning-goals.js";
import { syncLearningProgress } from "./services/learning-progress-sync.js";
import { TutorChat } from "./features/learning/TutorChat.jsx";
import { getNextLearningActivity } from "./services/next-learning-activity.js";
import { loadVisualVocabularyProgress } from "./services/local-visual-vocabulary-progress.js";
import { LiveInterpreter } from "./features/interpreter/LiveInterpreter.jsx";
import { Understand } from "./features/learning/Understand.jsx";
import { setStorageAccount } from "./services/account-storage.js";
import { loadCloudProfile, saveCloudProfile } from "./services/cloud-profile.js";

// Specific situational language exercises
import { AskingDirectionsSequenceExercise } from "./features/learning/AskingDirectionsSequenceExercise.jsx";
import { CafeOrderSequenceExercise } from "./features/learning/CafeOrderSequenceExercise.jsx";
import { CafeDialogueExercise } from "./features/learning/CafeDialogueExercise.jsx";
import { BusTravelSequenceExercise } from "./features/learning/BusTravelSequenceExercise.jsx";
import { GroceryShoppingSequenceExercise } from "./features/learning/GroceryShoppingSequenceExercise.jsx";
import { HotelCheckinSequenceExercise } from "./features/learning/HotelCheckinSequenceExercise.jsx";
import { DoctorEmergencyExercise } from "./features/learning/DoctorEmergencyExercise.jsx";
import { DailyConversationExercise } from "./features/learning/DailyConversationExercise.jsx";

const EXERCISES = [
  {
    id: "starter",
    title: { fi: "Alkeislauseet & Tervehdykset", es: "Frases iniciales", en: "Starter Phrases" },
    desc: { fi: "Opi 30 tärkeintä ilmaisua arkeen, tervehdyksiin ja asiointiin.", es: "Aprende las 30 expresiones clave del día a día.", en: "Learn 30 essential everyday expressions." },
    category: "basics",
    level: "Taso 1 · Alkeet",
    icon: "🌱",
    time: "5 min",
  },
  {
    id: "daily",
    title: { fi: "Arkikeskustelut & Esittäytyminen", es: "Conversación cotidiana", en: "Daily Conversation" },
    desc: { fi: "Tutustuminen, kuulumisten kysyminen ja luonteva sananvaihto.", es: "Saludos, presentaciones y charla cotidiana.", en: "Greetings, introductions and casual small talk." },
    category: "daily",
    level: "Taso 1 · Alkeet",
    icon: "🤝",
    time: "4 min",
  },
  {
    id: "cafeOrder",
    title: { fi: "Kahvilatilaus", es: "Pedido en la cafetería", en: "Cafe Order" },
    desc: { fi: "Kahvin, teen ja leivonnaisten tilaaminen loogisessa järjestyksessä.", es: "Pedir café, té y comida paso a paso.", en: "Order coffee, tea and snacks step by step." },
    category: "dining",
    level: "Taso 2 · Perusteet",
    icon: "☕",
    time: "5 min",
  },
  {
    id: "cafeDialogue",
    title: { fi: "Kahvilavuoropuhelu", es: "Diálogo en cafetería", en: "Cafe Dialogue" },
    desc: { fi: "Keskustelu tarjoilijan kanssa, suositusten kysyminen ja lasku.", es: "Conversación con el camarero y pago de la cuenta.", en: "Conversation with server and paying the bill." },
    category: "dining",
    level: "Taso 2 · Perusteet",
    icon: "🗣️",
    time: "6 min",
  },
  {
    id: "busTravel",
    title: { fi: "Bussimatka & Joukkoliikenne", es: "Viaje en autobús", en: "Bus Travel" },
    desc: { fi: "Matkalipun ostaminen, pysäkin varmistus ja matkustaminen.", es: "Comprar billete, consultar la parada y viajar.", en: "Buying a ticket, checking the stop, and travelling." },
    category: "travel",
    level: "Taso 2 · Perusteet",
    icon: "🚌",
    time: "5 min",
  },
  {
    id: "directions",
    title: { fi: "Tien kysyminen & Reittiohjeet", es: "Preguntar cómo llegar", en: "Asking Directions" },
    desc: { fi: "Kysy neuvoa kaupungilla ja seuraa ohjeita perille.", es: "Pedir indicaciones y orientarse en la ciudad.", en: "Ask for directions and find your way around." },
    category: "directions",
    level: "Taso 2 · Perusteet",
    icon: "🗺️",
    time: "5 min",
  },
  {
    id: "grocery",
    title: { fi: "Ruokaostokset kaupassa", es: "Compra de alimentos", en: "Grocery Shopping" },
    desc: { fi: "Tuotteiden valinta, punnitseminen ja asiointi kassalla.", es: "Elegir productos, pesar frutas y pagar en caja.", en: "Picking items, weighing produce, and checkout." },
    category: "shopping",
    level: "Taso 2 · Perusteet",
    icon: "🛒",
    time: "6 min",
  },
  {
    id: "hotel",
    title: { fi: "Hotelliin kirjautuminen", es: "Check-in en el hotel", en: "Hotel Check-in" },
    desc: { fi: "Varauksen vahvistus, avaimen nouto ja aamiaisen ajat.", es: "Confirmar reserva, recoger llave y consultar desayuno.", en: "Confirm booking, collect key, and breakfast hours." },
    category: "hotel",
    level: "Taso 3 · Kehittyvä",
    icon: "🏨",
    time: "6 min",
  },
  {
    id: "doctor",
    title: { fi: "Lääkärissä & Apteekissa", es: "En el médico y farmacia", en: "Doctor & Pharmacy" },
    desc: { fi: "Oireiden kuvaus, lääkärin tutkimus ja reseptilääkkeet.", es: "Describir síntomas, consulta y recogida de medicinas.", en: "Describe symptoms, doctor checkup, and prescriptions." },
    category: "health",
    level: "Taso 3 · Kehittyvä",
    icon: "🩺",
    time: "7 min",
  },
  {
    id: "vocabulary",
    title: { fi: "Visuaalinen kuvasanasto", es: "Vocabulario visual", en: "Visual Vocabulary" },
    desc: { fi: "Opi sanat valokuvien ja piirrosten avulla ilman ulkoaopettelua.", es: "Aprende con fotos e ilustraciones de forma visual.", en: "Learn words with photographs and illustrations visually." },
    category: "basics",
    level: "Kaikki tasot",
    icon: "🖼️",
    time: "10 min",
  },
];

const CATEGORIES = [
  { id: "all", label: { fi: "Kaikki harjoitukset", es: "Todos los ejercicios", en: "All exercises" } },
  { id: "dining", label: { fi: "Kahvila & Ruoka", es: "Café y Comida", en: "Cafe & Dining" } },
  { id: "travel", label: { fi: "Matkustus", es: "Viajes", en: "Travel" } },
  { id: "directions", label: { fi: "Reitit & Kaupunki", es: "Direcciones", en: "Directions" } },
  { id: "shopping", label: { fi: "Ostokset", es: "Compras", en: "Shopping" } },
  { id: "hotel", label: { fi: "Majoitus", es: "Alojamiento", en: "Lodging" } },
  { id: "health", label: { fi: "Terveys", es: "Salud", en: "Health" } },
  { id: "daily", label: { fi: "Arkielämä", es: "Vida cotidiana", en: "Daily life" } },
  { id: "basics", label: { fi: "Alkeet", es: "Básicos", en: "Basics" } },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [signUpMode, setSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showOtherGoogleInput, setShowOtherGoogleInput] = useState(false);

  const [preferences, setPreferences] = useState(() => loadLocalLanguagePreferences());
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");

  // Views & Modals
  const [showTutor, setShowTutor] = useState(false);
  const [showInterpreter, setShowInterpreter] = useState(false);
  const [showUnderstand, setShowUnderstand] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const accountRef = useRef(null);
  const profileReady = useRef(false);
  const profileEdited = useRef(false);

  const [learningProfile, setLearningProfile] = useState(() => loadLocalLearningProfile());
  const [learningProfileMessage, setLearningProfileMessage] = useState("");
  const [learningProgress, setLearningProgress] = useState(() => loadLocalLearningProgress());
  const [progressSyncMessage, setProgressSyncMessage] = useState("");
  const [progressSyncing, setProgressSyncing] = useState(false);
  const [studyDays, setStudyDays] = useState(() => loadStudyDays());

  const studySummary = getStudySummary(studyDays);
  const goalProgress = getLearningGoalProgress({
    todaySeconds: studySummary.todaySeconds,
    dailyGoalMinutes: learningProfile.dailyGoalMinutes,
    weekDays: studySummary.weekDays,
    weeklyGoalDays: learningProfile.weeklyGoalDays,
  });

  const dueReviewCount = getDuePhraseIds(learningProgress).length;
  const nextLearningActivity = getNextLearningActivity(learningProgress, loadVisualVocabularyProgress());
  const learningLevel = getLearningLevel(learningProgress.completedPhraseIds.length);
  const t = getTranslations(preferences.interfaceLanguage);

  // Authentication & session effect with Google auto-login and session persistence
  useEffect(() => {
    let mounted = true;
    function applyIdentity(nextUser) {
      if (accountRef.current !== (nextUser?.id ?? null)) {
        accountRef.current = nextUser?.id ?? null;
        profileReady.current = false;
        profileEdited.current = false;
        setStorageAccount(accountRef.current);
        setPreferences(loadLocalLanguagePreferences());
        const profile = loadLocalLearningProfile();
        if (!profile.displayName && (nextUser?.name || nextUser?.user_metadata?.full_name)) {
          profile.displayName = nextUser.name || nextUser.user_metadata?.full_name;
          saveLocalLearningProfile(profile);
        }
        setLearningProfile(profile);
        setLearningProgress(loadLocalLearningProgress());
        setStudyDays(loadStudyDays());
        setShowTutor(false);
        setShowInterpreter(false);
        setShowUnderstand(false);
        setActiveExercise(null);
      }
      setUser(nextUser);
    }

    // 1. Check for active session or Google auto-login
    getActiveSession().then(({ user: activeUser }) => {
      if (!mounted) return;
      if (activeUser) {
        applyIdentity(activeUser);
      }
      setAuthLoading(false);
    });

    // 2. Listen to Supabase if configured
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
        if (session?.user) {
          applyIdentity(session.user);
        } else if (event === "SIGNED_OUT") {
          applyIdentity(null);
        }
        setAuthMessage("");
      });
      return () => {
        mounted = false;
        authListener?.subscription?.unsubscribe?.();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Sync cloud profile if logged in
  useEffect(() => {
    if (!user) return;
    let active = true;
    loadCloudProfile(user.id)
      .then((profile) => {
        if (!active) return;
        profileReady.current = true;
        if (!profileEdited.current) {
          saveLocalLearningProfile(profile);
          setLearningProfile(profile);
        }
      })
      .catch(() => {
        if (active) setLearningProfileMessage(t.goalSaveFailed);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !profileEdited.current) return;
    const timer = setTimeout(() => {
      void saveCloudProfile(user.id, learningProfile).catch(() =>
        setLearningProfileMessage(t.goalSaveFailed)
      );
    }, 450);
    return () => clearTimeout(timer);
  }, [learningProfile, user?.id]);

  useEffect(() => {
    if (!user) {
      setProgressSyncMessage("");
      setProgressSyncing(false);
      return;
    }
    let mounted = true;
    setProgressSyncing(true);
    setProgressSyncMessage(t.progressSyncing);
    syncLearningProgress(user.id)
      .then((snapshot) => {
        if (!mounted) return;
        setLearningProgress(snapshot.learning);
        setStudyDays(snapshot.studyDays);
        setProgressSyncMessage(t.progressSynced);
      })
      .catch((error) => {
        if (!mounted) return;
        setProgressSyncMessage(
          error instanceof Error ? `${t.progressSyncFailed} ${error.message}` : t.progressSyncFailed
        );
      })
      .finally(() => {
        if (mounted) setProgressSyncing(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleGoogleLogin(targetEmail = null) {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const emailToUse = targetEmail || DEFAULT_GOOGLE_USER.email;
      const res = await signInWithGoogle(emailToUse);
      if (res?.user) {
        accountRef.current = res.user.id;
        setStorageAccount(res.user.id);
        const profile = loadLocalLearningProfile();
        if (!profile.displayName) {
          profile.displayName = res.user.name;
          saveLocalLearningProfile(profile);
        }
        setLearningProfile(profile);
        setUser(res.user);
        setAuthMessage("Kirjauduttu sisään Google-tilillä!");
        setTimeout(() => setShowAuthModal(false), 350);
      }
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : "Google-kirjautuminen epäonnistui.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleAuthentication() {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const res = await signInWithEmailPassword(email, password, signUpMode);
      if (res?.user) {
        accountRef.current = res.user.id;
        setStorageAccount(res.user.id);
        const profile = loadLocalLearningProfile();
        if (!profile.displayName) {
          profile.displayName = res.user.name;
          saveLocalLearningProfile(profile);
        }
        setLearningProfile(profile);
        setUser(res.user);
        setAuthMessage(signUpMode ? "Tili luotu onnistuneesti!" : "Kirjauduttu sisään onnistuneesti!");
        setTimeout(() => setShowAuthModal(false), 350);
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Kirjautuminen epäonnistui.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    await authSignOut();
    accountRef.current = null;
    setUser(null);
    setStorageAccount(null);
    setPreferences(loadLocalLanguagePreferences());
    setLearningProfile(loadLocalLearningProfile());
    setLearningProgress(loadLocalLearningProgress());
    setStudyDays(loadStudyDays());
    setAuthMessage("Olet kirjautunut ulos.");
    setAuthBusy(false);
    setShowAuthModal(false);
  }

  function updateLearningProfile(key, value) {
    profileEdited.current = true;
    const next = { ...learningProfile, [key]: value };
    setLearningProfile(next);
    setLearningProfileMessage(saveLocalLearningProfile(next) ? t.goalSaved : t.goalSaveFailed);
  }

  function updatePreference(key, value) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    saveLocalLanguagePreferences(next);
  }

  async function syncProgressAfterPractice() {
    setLearningProgress(loadLocalLearningProgress());
    setStudyDays(loadStudyDays());
    if (!user || !supabase) return;
    setProgressSyncing(true);
    try {
      const snapshot = await syncLearningProgress(user.id);
      setLearningProgress(snapshot.learning);
      setStudyDays(snapshot.studyDays);
    } catch {
      // offline silent
    } finally {
      setProgressSyncing(false);
    }
  }

  // Active subviews
  if (showUnderstand) {
    return (
      <Understand
        interfaceLanguage={preferences.interfaceLanguage}
        nativeLanguage={preferences.nativeLanguage}
        user={user}
        onClose={() => setShowUnderstand(false)}
      />
    );
  }

  if (showInterpreter) {
    return (
      <LiveInterpreter
        interfaceLanguage={preferences.interfaceLanguage}
        userLanguage={preferences.nativeLanguage}
        counterpartLanguage={preferences.interpretationSourceLanguage}
        onClose={() => setShowInterpreter(false)}
      />
    );
  }

  if (showTutor) {
    const tutorLevel =
      learningLevel.current.id === "beginner"
        ? "beginner"
        : learningLevel.current.id === "starter"
        ? "elementary"
        : learningLevel.current.id === "developing"
        ? "intermediate"
        : "advanced";
    return (
      <TutorChat
        interfaceLanguage={preferences.interfaceLanguage}
        nativeLanguage={preferences.nativeLanguage}
        learningLanguage={preferences.learningLanguage}
        learnerLevel={tutorLevel}
        onClose={() => setShowTutor(false)}
      />
    );
  }

  // Exercise Routing
  if (activeExercise) {
    const closeExercise = () => {
      setActiveExercise(null);
      void syncProgressAfterPractice();
    };

    if (activeExercise === "starter") {
      return (
        <StarterLesson
          interfaceLanguage={preferences.interfaceLanguage}
          nativeLanguage={preferences.nativeLanguage}
          learningLanguage={preferences.learningLanguage}
          reviewOnly={false}
          onClose={closeExercise}
        />
      );
    }
    if (activeExercise === "vocabulary") {
      return (
        <VisualVocabulary
          interfaceLanguage={preferences.interfaceLanguage}
          nativeLanguage={preferences.nativeLanguage}
          learningLanguage={preferences.learningLanguage}
          onClose={closeExercise}
        />
      );
    }

    return (
      <SafeAreaView style={styles.exerciseWrapper}>
        <View style={styles.exerciseTopBar}>
          <Pressable accessibilityRole="button" onPress={closeExercise} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ {t.back || "Takaisin"}</Text>
          </Pressable>
          <Text style={styles.exerciseHeaderTitle}>Elovio kieliharjoitus</Text>
        </View>
        <ScrollView contentContainerStyle={styles.exerciseBody}>
          {activeExercise === "daily" && (
            <DailyConversationExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
          {activeExercise === "cafeOrder" && (
            <CafeOrderSequenceExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
          {activeExercise === "cafeDialogue" && (
            <CafeDialogueExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
          {activeExercise === "busTravel" && (
            <BusTravelSequenceExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
          {activeExercise === "directions" && (
            <AskingDirectionsSequenceExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
          {activeExercise === "grocery" && (
            <GroceryShoppingSequenceExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
          {activeExercise === "hotel" && (
            <HotelCheckinSequenceExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
          {activeExercise === "doctor" && (
            <DoctorEmergencyExercise
              interfaceLanguage={preferences.interfaceLanguage}
              learningLanguage={preferences.learningLanguage}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const langCode = preferences.interfaceLanguage;
  const filteredExercises =
    selectedCategory === "all"
      ? EXERCISES
      : EXERCISES.filter((ex) => ex.category === selectedCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* TOP BAR CONTRACT: Brand — Nav links — Profile / Action */}
        <header className="flex items-center justify-between gap-8 py-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight text-emerald-950 font-serif">
              elovio
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 uppercase">
              {preferences.interfaceLanguage}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <a href="#harjoitukset" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              Harjoitukset
            </a>
            <button
              onClick={() => setShowInterpreter(true)}
              className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 font-medium"
            >
              🎙️ Äänikääntäjä
            </button>
            <button
              onClick={() => setShowTutor(true)}
              className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 font-medium"
            >
              💬 AI-Opettaja
            </button>
            <button
              onClick={() => setActiveExercise("vocabulary")}
              className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 font-medium"
            >
              🖼️ Sanasto
            </button>
            <button
              onClick={() => setShowUnderstand(true)}
              className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 font-medium"
            >
              📖 Kieliapuri
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAuthModal(true)}
                style={styles.profileBtn}
              >
                <View style={styles.headerProfileRow}>
                  <View style={styles.googleAvatarCircle}>
                    <Text style={styles.googleAvatarText}>
                      {(learningProfile.displayName || user.name || user.email || "G").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ gap: 1 }}>
                    <Text style={styles.profileBtnText} numberOfLines={1}>
                      {learningProfile.displayName || user.name || user.email}
                    </Text>
                    <Text style={styles.profileBadgeText}>
                      {user.provider === "google" ? "✓ Google-tili" : "✓ Kirjautunut"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAuthModal(true)}
                style={styles.loginBtnHeader}
              >
                <View style={styles.googleIconBadge}>
                  <Text style={styles.googleGLogoText}>G</Text>
                </View>
                <Text style={styles.loginBtnHeaderText}>Kirjaudu Googlella</Text>
              </Pressable>
            )}
          </div>
        </header>

        {/* HERO SECTION */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>KIELTEN OPPIMINEN · ARJEN TILANTEET · SUOMI, ESPANJA, ENGLANTI</Text>
          <Text style={styles.heroTitle}>Opi kieliä luonnollisesti arjen aidoissa tilanteissa</Text>
          <Text style={styles.heroBody}>
            Ei puuduttavia kielioppilistoja. Harjoittele kahvilassa tilaamista, suunnan kysymistä, lääkärissä asiointia ja keskusteluja. Käytä kaksisuuntaista puhetulkkia ja harjoittele tekoälytutorin kanssa.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveExercise("starter")}
              style={styles.heroPrimaryBtn}
            >
              <Text style={styles.heroPrimaryBtnText}>▶ Aloita harjoitus</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowInterpreter(true)}
              style={styles.heroSecondaryBtn}
            >
              <Text style={styles.heroSecondaryBtnText}>🎙️ Avaa Live-äänikääntäjä</Text>
            </Pressable>
          </View>
        </View>

        {/* DASHBOARD STRIP: Daily Goal & Streak & Level */}
        <View style={styles.statsStrip}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>PÄIVITTÄINEN TAVOITE</Text>
            <Text style={styles.statNumber}>
              {goalProgress.daily.current} / {learningProfile.dailyGoalMinutes} min
            </Text>
            <View style={styles.statTrack}>
              <View style={[styles.statFill, { width: `${Math.min(goalProgress.daily.percent, 100)}%` }]} />
            </View>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>VIIKON AKTIIVISUUS</Text>
            <Text style={styles.statNumber}>
              {goalProgress.weekly.current} / {learningProfile.weeklyGoalDays} päivää
            </Text>
            <View style={styles.statTrack}>
              <View style={[styles.statFill, { width: `${Math.min(goalProgress.weekly.percent, 100)}%` }]} />
            </View>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>OPPIMISTASO</Text>
            <Text style={styles.statNumberText}>
              {t[learningLevel.current.labelKey] || "Alkeet"}
            </Text>
            <Text style={styles.statSubText}>{learningLevel.learned} / 30 lausetta opittu</Text>
          </View>
        </View>

        {/* CORE TOOLS GRID */}
        <View style={styles.toolsSection}>
          <Text style={styles.sectionHeading}>Päätoiminnot ja oppimistyökalut</Text>
          <View style={styles.toolsGrid}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowInterpreter(true)}
              style={styles.toolCard}
            >
              <Text style={styles.toolIcon}>🎙️</Text>
              <Text style={styles.toolTitle}>Live Äänikääntäjä</Text>
              <Text style={styles.toolDesc}>
                Kaksisuuntainen puhetulkkaus mikrofonilla ja puhetoistolla. Puhu suomea ja kuule käännös espanjaksi tai englanniksi reaaliajassa.
              </Text>
              <Text style={styles.toolLink}>Avaa tulkki →</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setShowTutor(true)}
              style={styles.toolCard}
            >
              <Text style={styles.toolIcon}>🤖</Text>
              <Text style={styles.toolTitle}>AI-Opettaja</Text>
              <Text style={styles.toolDesc}>
                Keskustele tekoälytutorin kanssa, saa välitöntä palautetta, korjausehdotuksia ja käytännön kielivinkkejä.
              </Text>
              <Text style={styles.toolLink}>Aloita keskustelu →</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveExercise("vocabulary")}
              style={styles.toolCard}
            >
              <Text style={styles.toolIcon}>🖼️</Text>
              <Text style={styles.toolTitle}>Kuvallinen Sanasto</Text>
              <Text style={styles.toolDesc}>
                Opi esineet, ruoat ja toiminnot valokuvien ja piirrosten avulla ilman kääntämistä.
              </Text>
              <Text style={styles.toolLink}>Harjoittele sanastoa →</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setShowUnderstand(true)}
              style={styles.toolCard}
            >
              <Text style={styles.toolIcon}>📖</Text>
              <Text style={styles.toolTitle}>Kieliapuri</Text>
              <Text style={styles.toolDesc}>
                Syötä lause tai ota kuva asiakirjasta, kyltistä tai ruokalistasta ja saa kattava sanaselitys.
              </Text>
              <Text style={styles.toolLink}>Avaa kieliapuri →</Text>
            </Pressable>
          </View>
        </View>

        {/* EXERCISES CATALOGUE */}
        <View id="harjoitukset" style={styles.exercisesSection}>
          <View style={styles.exerciseHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>Kieliharjoitukset ja tilanteet</Text>
              <Text style={styles.sectionSubtitle}>
                Valitse kiinnostava tilanne ja harjoittele lauseita, sanastoa ja puhetta
              </Text>
            </View>
            {dueReviewCount > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveExercise("starter")}
                style={styles.reviewChip}
              >
                <Text style={styles.reviewChipText}>🔄 {dueReviewCount} kertausta odottaa</Text>
              </Pressable>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.categoryPill, active && styles.categoryPillActive]}
                >
                  <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                    {cat.label[langCode] || cat.label.fi}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Exercise Cards Grid */}
          <View style={styles.exerciseGrid}>
            {filteredExercises.map((ex) => (
              <View key={ex.id} style={styles.exerciseCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardIcon}>{ex.icon}</Text>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>{ex.level}</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{ex.title[langCode] || ex.title.fi}</Text>
                <Text style={styles.cardDesc}>{ex.desc[langCode] || ex.desc.fi}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>⏱️ {ex.time}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActiveExercise(ex.id)}
                    style={styles.cardStartBtn}
                  >
                    <Text style={styles.cardStartBtnText}>Aloita →</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* SETTINGS & LANGUAGES FOOTER STRIP */}
        <View style={styles.footerSettings}>
          <Text style={styles.footerHeading}>Kielivalinnat ja asetukset</Text>
          <View style={styles.langSelectorRow}>
            <View style={styles.langChoiceBlock}>
              <Text style={styles.langChoiceLabel}>Käyttöliittymä:</Text>
              <View style={styles.langBtnGroup}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    accessibilityRole="button"
                    onPress={() => updatePreference("interfaceLanguage", l.code)}
                    style={[
                      styles.langBtn,
                      preferences.interfaceLanguage === l.code && styles.langBtnActive,
                    ]}
                  >
                    <Text style={styles.langBtnText}>{l.flag} {l.nativeName}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.langChoiceBlock}>
              <Text style={styles.langChoiceLabel}>Opiskeltava kieli:</Text>
              <View style={styles.langBtnGroup}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    accessibilityRole="button"
                    onPress={() => updatePreference("learningLanguage", l.code)}
                    style={[
                      styles.langBtn,
                      preferences.learningLanguage === l.code && styles.langBtnActive,
                    ]}
                  >
                    <Text style={styles.langBtnText}>{l.flag} {l.nativeName}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.copyrightText}>Elovio · Kielikurssi ja puhetulkki · 2026</Text>
        </View>
      </ScrollView>

      {/* USER & ACCOUNT MODAL */}
      {showAuthModal && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Käyttäjäprofiili ja tavoitteet</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAuthModal(false)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14 }}>
              {/* Local profile edit */}
              <View style={styles.profileSection}>
                <Text style={styles.fieldLabel}>Oppijan nimi / Nimimerkki</Text>
                <TextInput
                  placeholder="Kirjoita nimesi (esim. Toni)"
                  value={learningProfile.displayName}
                  onChangeText={(val) => updateLearningProfile("displayName", val)}
                  style={styles.modalInput}
                />

                <Text style={styles.fieldLabel}>Päivittäinen opiskelutavoite (minuuttia)</Text>
                <View style={styles.minutesRow}>
                  {[5, 10, 15, 20, 30].map((mins) => (
                    <Pressable
                      key={mins}
                      accessibilityRole="button"
                      onPress={() => updateLearningProfile("dailyGoalMinutes", mins)}
                      style={[
                        styles.minutePill,
                        learningProfile.dailyGoalMinutes === mins && styles.minutePillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.minutePillText,
                          learningProfile.dailyGoalMinutes === mins && styles.minutePillTextActive,
                        ]}
                      >
                        {mins} min
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Viikkotavoite (opiskelupäivää viikossa)</Text>
                <View style={styles.minutesRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <Pressable
                      key={days}
                      accessibilityRole="button"
                      onPress={() => updateLearningProfile("weeklyGoalDays", days)}
                      style={[
                        styles.minutePill,
                        learningProfile.weeklyGoalDays === days && styles.minutePillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.minutePillText,
                          learningProfile.weeklyGoalDays === days && styles.minutePillTextActive,
                        ]}
                      >
                        {days} pv
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {!!learningProfileMessage && (
                  <Text style={styles.statusSuccess}>{learningProfileMessage}</Text>
                )}
              </View>

              {/* Google & Account Section */}
              <View style={styles.cloudSection}>
                {user ? (
                  <View style={styles.userLoggedInCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={styles.googleAvatarCircleLarge}>
                        <Text style={styles.googleAvatarTextLarge}>
                          {(learningProfile.displayName || user.name || user.email || "G").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.loggedInName}>
                          {learningProfile.displayName || user.name || "Google-oppija"}
                        </Text>
                        <Text style={styles.loggedInEmail}>{user.email}</Text>
                        <Text style={styles.googleVerifiedBadge}>
                          ✓ {user.provider === "google" ? "Kirjautunut Google-tilillä" : "Kirjautunut sisään"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cloudNoticeText}>
                      ⚡ Automaattinen kirjautuminen on aktiivinen tällä laitteella. Opiskeluputki (streak), tavoitteet ja sanasto tallentuvat tilillesi.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={authBusy}
                      onPress={handleSignOut}
                      style={styles.signOutBtn}
                    >
                      <Text style={styles.signOutBtnText}>
                        {authBusy ? "Kirjaudutaan ulos..." : "Kirjaudu ulos"}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.authForm}>
                    <Text style={styles.sectionSubtitle}>Kirjaudu tilille</Text>
                    <Text style={styles.cloudNoticeText}>
                      Kirjaudu Google-tililläsi, jotta opiskelutuloksesi ja sanastosi säilyvät automaattisesti tallessa.
                    </Text>

                    {/* Prominent Google 1-Click Login Button */}
                    <Pressable
                      accessibilityRole="button"
                      disabled={authBusy}
                      onPress={() => handleGoogleLogin("toni.jukka4@gmail.com")}
                      style={[styles.googleBigBtn, authBusy && { opacity: 0.6 }]}
                    >
                      <View style={styles.googleIconBadge}>
                        <Text style={styles.googleGLogoText}>G</Text>
                      </View>
                      <Text style={styles.googleBigBtnText}>
                        {authBusy ? "Yhdistetään..." : "Jatka Google-tilillä (toni.jukka4@gmail.com)"}
                      </Text>
                    </Pressable>

                    {/* Option to use another Google email */}
                    {showOtherGoogleInput ? (
                      <View style={{ gap: 8, marginTop: 4 }}>
                        <TextInput
                          placeholder="Anna toinen Google-sähköposti (esim. nimi@gmail.com)"
                          value={customGoogleEmail}
                          onChangeText={setCustomGoogleEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          style={styles.modalInput}
                        />
                        <Pressable
                          accessibilityRole="button"
                          disabled={authBusy || !customGoogleEmail.trim()}
                          onPress={() => handleGoogleLogin(customGoogleEmail.trim())}
                          style={[styles.googleSecondaryBtn, (!customGoogleEmail.trim() || authBusy) && { opacity: 0.5 }]}
                        >
                          <Text style={styles.googleSecondaryBtnText}>
                            {authBusy ? "Yhdistetään..." : "Kirjaudu tällä Google-osoitteella"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={() => setShowOtherGoogleInput(true)}>
                        <Text style={styles.switchAuthMode}>
                          Käytä toista Google-tiliä ›
                        </Text>
                      </Pressable>
                    )}

                    {/* Divider */}
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>tai sähköpostilla ja salasanalla</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TextInput
                      placeholder="Sähköpostiosoite"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      style={styles.modalInput}
                    />
                    <TextInput
                      placeholder="Salasana (väh. 6 merkkiä)"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      style={styles.modalInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={authBusy || !email.trim() || password.length < 6}
                      onPress={handleAuthentication}
                      style={[
                        styles.authSubmitBtn,
                        (authBusy || !email.trim() || password.length < 6) && { opacity: 0.5 },
                      ]}
                    >
                      <Text style={styles.authSubmitBtnText}>
                        {authBusy ? "Yhdistetään..." : signUpMode ? "Luo uusi tili" : "Kirjaudu sisään"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setSignUpMode(!signUpMode)}>
                      <Text style={styles.switchAuthMode}>
                        {signUpMode ? "Onko sinulla jo tili? Kirjaudu sisään" : "Eikö tiliä vielä? Luo tili"}
                      </Text>
                    </Pressable>
                    {!!authMessage && <Text style={styles.statusMessage}>{authMessage}</Text>}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 64, gap: 28, maxWidth: 1200, alignSelf: "center", width: "100%" },
  profileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#064E3B",
  },
  profileBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  heroCard: {
    backgroundColor: "#064E3B",
    borderRadius: 20,
    padding: 30,
    gap: 14,
  },
  heroEyebrow: { color: "#A7F3D0", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -1, lineHeight: 40 },
  heroBody: { color: "#D1FAE5", fontSize: 15, lineHeight: 24, maxWidth: 750 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  heroPrimaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#10B981",
  },
  heroPrimaryBtnText: { color: "#064E3B", fontSize: 14, fontWeight: "800" },
  heroSecondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroSecondaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  statsStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statCol: { flex: 1, minWidth: 200, gap: 6 },
  statLabel: { color: "#64748B", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  statNumber: { color: "#064E3B", fontSize: 24, fontWeight: "800" },
  statNumberText: { color: "#064E3B", fontSize: 20, fontWeight: "800" },
  statSubText: { color: "#64748B", fontSize: 12 },
  statTrack: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden", marginTop: 4 },
  statFill: { height: "100%", backgroundColor: "#10B981", borderRadius: 4 },
  toolsSection: { gap: 16 },
  sectionHeading: { color: "#0F172A", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  sectionSubtitle: { color: "#64748B", fontSize: 14, marginTop: 2 },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  toolCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  toolIcon: { fontSize: 32 },
  toolTitle: { color: "#0F172A", fontSize: 18, fontWeight: "700" },
  toolDesc: { color: "#475569", fontSize: 13, lineHeight: 20, flex: 1 },
  toolLink: { color: "#059669", fontSize: 13, fontWeight: "700", marginTop: 4 },
  exercisesSection: { gap: 16 },
  exerciseHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 },
  reviewChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  reviewChipText: { color: "#92400E", fontSize: 13, fontWeight: "700" },
  categoryScroll: { gap: 8, paddingVertical: 4 },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  categoryPillActive: {
    backgroundColor: "#064E3B",
    borderColor: "#064E3B",
  },
  categoryPillText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  categoryPillTextActive: { color: "#FFFFFF", fontWeight: "700" },
  exerciseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  exerciseCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardIcon: { fontSize: 26 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#F1F5F9" },
  levelBadgeText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "700" },
  cardDesc: { color: "#64748B", fontSize: 13, lineHeight: 19, flex: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  cardTime: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  cardStartBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#059669",
  },
  cardStartBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  footerSettings: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 16,
  },
  footerHeading: { color: "#0F172A", fontSize: 16, fontWeight: "700" },
  langSelectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  langChoiceBlock: { gap: 8 },
  langChoiceLabel: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  langBtnGroup: { flexDirection: "row", gap: 8 },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  langBtnActive: { borderColor: "#059669", backgroundColor: "#ECFDF5" },
  langBtnText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  copyrightText: { color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 8 },
  exerciseWrapper: { flex: 1, backgroundColor: "#F8FAFC" },
  exerciseTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#F1F5F9" },
  backButtonText: { color: "#059669", fontSize: 14, fontWeight: "700" },
  exerciseHeaderTitle: { color: "#0F172A", fontSize: 15, fontWeight: "700" },
  exerciseBody: { padding: 18, maxWidth: 900, alignSelf: "center", width: "100%" },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    maxWidth: 500,
    width: "100%",
    maxHeight: "90%",
    gap: 16,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: "#0F172A", fontSize: 20, fontWeight: "800" },
  modalClose: { padding: 6 },
  modalCloseText: { color: "#64748B", fontSize: 18, fontWeight: "700" },
  profileSection: { gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  fieldLabel: { color: "#334155", fontSize: 13, fontWeight: "700" },
  modalInput: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  minutesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  minutePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  minutePillActive: { backgroundColor: "#064E3B", borderColor: "#064E3B" },
  minutePillText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  minutePillTextActive: { color: "#FFFFFF", fontWeight: "700" },
  statusSuccess: { color: "#059669", fontSize: 12, fontWeight: "600" },
  cloudSection: { gap: 10, paddingTop: 4 },
  cloudNoticeText: { color: "#64748B", fontSize: 13, lineHeight: 19 },
  authForm: { gap: 10 },
  authSubmitBtn: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#064E3B",
    alignItems: "center",
    justifyContent: "center",
  },
  authSubmitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  switchAuthMode: { color: "#059669", fontSize: 13, fontWeight: "600", textAlign: "center" },
  statusMessage: { color: "#DC2626", fontSize: 12, textAlign: "center" },
  userLoggedInCard: { padding: 16, borderRadius: 12, backgroundColor: "#F0FDF4", gap: 10, borderWidth: 1, borderColor: "#BBF7D0" },
  loggedInName: { color: "#064E3B", fontSize: 16, fontWeight: "800" },
  loggedInEmail: { color: "#475569", fontSize: 13, fontWeight: "600" },
  googleVerifiedBadge: { color: "#059669", fontSize: 12, fontWeight: "700" },
  googleAvatarCircleLarge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#064E3B", alignItems: "center", justifyContent: "center" },
  googleAvatarTextLarge: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  headerProfileRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  googleAvatarCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#10B981" },
  googleAvatarText: { color: "#064E3B", fontSize: 12, fontWeight: "800" },
  profileBadgeText: { color: "#A7F3D0", fontSize: 10, fontWeight: "700" },
  loginBtnHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1" },
  googleIconBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  googleGLogoText: { fontSize: 13, fontWeight: "900", color: "#4285F4" },
  loginBtnHeaderText: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  googleBigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 48, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#CBD5E1", paddingHorizontal: 14 },
  googleBigBtnText: { color: "#1F2937", fontSize: 13, fontWeight: "700" },
  googleSecondaryBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#064E3B", alignItems: "center", justifyContent: "center" },
  googleSecondaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { color: "#94A3B8", fontSize: 11, fontWeight: "600" },
  signOutBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  signOutBtnText: { color: "#DC2626", fontSize: 13, fontWeight: "700" },
});
