import "expo-sqlite/localStorage/install";
import { useEffect, useState } from "react";
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
import type { User } from "@supabase/supabase-js";
import {
  DEFAULT_LANGUAGE_PREFERENCES,
  LANGUAGES,
  type LanguageCode,
} from "./src/config/languages";
import type { UserLanguagePreferences } from "./src/types/preferences";
import { isSupabaseConfigured, supabase } from "./src/lib/supabase";
import {
  loadLanguagePreferences,
  saveLanguagePreferences,
} from "./src/services/language-preferences";
import {
  loadLocalLanguagePreferences,
  saveLocalLanguagePreferences,
} from "./src/services/local-language-preferences";
import {
  getTranslations,
  type TranslationKey,
} from "./src/i18n/translations";
import { StarterLesson } from "./src/features/learning/StarterLesson";
import { VisualVocabulary } from "./src/features/learning/VisualVocabulary";
import type { LearningProfile } from "./src/types/learning";
import { loadLocalLearningProfile, saveLocalLearningProfile } from "./src/services/local-learning-profile";
import { loadLocalLearningProgress } from "./src/services/local-learning-progress";
import { getDuePhraseIds } from "./src/services/spaced-repetition";
import { getStudySummary, loadStudyDays } from "./src/services/local-learning-activity";
import { getLearningLevel } from "./src/services/learning-levels";
import { getLearningGoalProgress } from "./src/services/learning-goals";
import { syncLearningProgress } from "./src/services/learning-progress-sync";
import { TutorChat } from "./src/features/learning/TutorChat";
import { LearningPathSuggestion } from "./src/features/learning/LearningPathSuggestion";
import { getNextLearningActivity } from "./src/services/next-learning-activity";
import { loadVisualVocabularyProgress } from "./src/services/local-visual-vocabulary-progress";
import { LiveInterpreter } from "./src/features/interpreter/LiveInterpreter";
import { UnderstandAssistant } from "./src/features/understand/UnderstandAssistant";

const preferenceFields: {
  key: keyof UserLanguagePreferences;
  title: TranslationKey;
  helper: TranslationKey;
}[] = [
  { key: "interfaceLanguage", title: "interfaceLanguage", helper: "interfaceLanguageHelp" },
  { key: "nativeLanguage", title: "nativeLanguage", helper: "nativeLanguageHelp" },
  { key: "learningLanguage", title: "learningLanguage", helper: "learningLanguageHelp" },
  { key: "interpretationSourceLanguage", title: "sourceLanguage", helper: "sourceLanguageHelp" },
  { key: "interpretationTargetLanguage", title: "targetLanguage", helper: "targetLanguageHelp" },
];

function LanguageChoice({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}) {
  return (
    <View style={styles.choiceList}>
      {LANGUAGES.map((language) => {
        const selected = language.code === value;
        return (
          <Pressable
            key={language.code}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={language.nativeName}
            onPress={() => onChange(language.code)}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <Text style={styles.choiceText}>
              {language.flag} {language.nativeName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [signUpMode, setSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [preferences, setPreferences] = useState<UserLanguagePreferences>(
    () => loadLocalLanguagePreferences(),
  );
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [showLesson, setShowLesson] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [showDueReviews, setShowDueReviews] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [showInterpreter, setShowInterpreter] = useState(false);
  const [showUnderstand, setShowUnderstand] = useState(false);
  const [learningProfile, setLearningProfile] = useState<LearningProfile>(() => loadLocalLearningProfile());
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

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthMessage(error.message);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthMessage("");
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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
      .catch((error: unknown) => {
        if (!mounted) return;
        setProgressSyncMessage(
          error instanceof Error ? `${t.progressSyncFailed} ${error.message}` : t.progressSyncFailed,
        );
      })
      .finally(() => {
        if (mounted) setProgressSyncing(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPreferences(loadLocalLanguagePreferences());
      setPreferencesLoading(false);
      return;
    }

    let mounted = true;
    setPreferencesLoading(true);
    loadLanguagePreferences(user.id)
      .then((stored) => {
        if (mounted) {
          setPreferences(stored);
          const savedLocally = saveLocalLanguagePreferences(stored);
          setPreferencesMessage(savedLocally ? "" : t.localPreferencesSaveFailed);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setPreferencesMessage(
            error instanceof Error ? error.message : t.loadPreferencesFailed,
          );
        }
      })
      .finally(() => {
        if (mounted) setPreferencesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleAuthentication() {
    if (!supabase) return;
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = signUpMode
        ? await supabase.auth.signUp({ email: normalizedEmail, password })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (result.error) throw result.error;
      if (signUpMode && !result.data.session) {
        setAuthMessage(t.signUpCheckEmail);
      } else {
        setAuthMessage(signUpMode ? t.accountCreated : t.signInSuccess);
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : t.signInFailed);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    setAuthBusy(true);
    const { error } = await supabase.auth.signOut();
    setAuthMessage(error ? error.message : t.signedOut);
    setAuthBusy(false);
  }

  async function handleSavePreferences() {
    if (!user) {
      setPreferencesMessage(
        saveLocalLanguagePreferences(preferences)
          ? t.localPreferencesSaved
          : t.localPreferencesSaveFailed,
      );
      return;
    }
    setSavingPreferences(true);
    setPreferencesMessage("");
    try {
      const saved = await saveLanguagePreferences(user.id, preferences);
      setPreferences(saved);
      const savedLocally = saveLocalLanguagePreferences(saved);
      setPreferencesMessage(
        savedLocally ? t.cloudPreferencesSaved : t.localPreferencesSaveFailed,
      );
    } catch (error) {
      setPreferencesMessage(
        error instanceof Error ? error.message : t.savePreferencesFailed,
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  function updatePreference(key: keyof UserLanguagePreferences, value: LanguageCode) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setPreferencesMessage(
      saveLocalLanguagePreferences(next)
        ? t.unsavedChanges
        : t.localPreferencesSaveFailed,
    );
  }

  function updateLearningProfile<K extends keyof LearningProfile>(key: K, value: LearningProfile[K]) {
    const next = { ...learningProfile, [key]: value };
    setLearningProfile(next);
    setLearningProfileMessage(
      saveLocalLearningProfile(next) ? t.goalSaved : t.goalSaveFailed,
    );
  }

  async function syncProgressAfterPractice() {
    setLearningProgress(loadLocalLearningProgress());
    setStudyDays(loadStudyDays());
    if (!user) return;

    setProgressSyncing(true);
    setProgressSyncMessage(t.progressSyncing);
    try {
      const snapshot = await syncLearningProgress(user.id);
      setLearningProgress(snapshot.learning);
      setStudyDays(snapshot.studyDays);
      setProgressSyncMessage(t.progressSynced);
    } catch (error) {
      setProgressSyncMessage(
        error instanceof Error ? `${t.progressSyncFailed} ${error.message}` : t.progressSyncFailed,
      );
    } finally {
      setProgressSyncing(false);
    }
  }

  if (showUnderstand) {
    return (
      <UnderstandAssistant
        interfaceLanguage={preferences.interfaceLanguage}
        explanationLanguage={preferences.nativeLanguage}
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

  if (showVocabulary) {
    return (
      <VisualVocabulary
        interfaceLanguage={preferences.interfaceLanguage}
        nativeLanguage={preferences.nativeLanguage}
        learningLanguage={preferences.learningLanguage}
        onClose={() => {
          setShowVocabulary(false);
          void syncProgressAfterPractice();
        }}
      />
    );
  }

  if (showLesson || showDueReviews) {
    return (
      <StarterLesson
        interfaceLanguage={preferences.interfaceLanguage}
        nativeLanguage={preferences.nativeLanguage}
        learningLanguage={preferences.learningLanguage}
        reviewOnly={showDueReviews}
        onClose={() => {
          setShowLesson(false);
          setShowDueReviews(false);
          setLearningProgress(loadLocalLearningProgress());
          setStudyDays(loadStudyDays());
          void syncProgressAfterPractice();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t.eyebrow}</Text>
          <Text style={styles.brand}>elovio</Text>
          <Text style={styles.tagline}>{t.tagline}</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.sectionLabel}>{t.welcome}</Text>
          <Text style={styles.heading}>{t.heading}</Text>
          <Text style={styles.body}>{t.intro}</Text>
        </View>

        <View style={styles.accountSection}>
          <Text style={styles.sectionLabel}>{t.account}</Text>
          {!isSupabaseConfigured ? (
            <View style={styles.noticeCard}>
              <Text style={styles.cardTitle}>{t.supabaseMissingTitle}</Text>
              <Text style={styles.body}>{t.supabaseMissingBody}</Text>
            </View>
          ) : authLoading ? (
            <ActivityIndicator />
          ) : user ? (
            <View style={styles.noticeCard}>
              <Text style={styles.cardTitle}>{t.signedIn}</Text>
              <Text style={styles.body}>{user.email ?? user.id}</Text>
              <Text accessibilityRole="text" style={styles.statusText}>{progressSyncing ? t.progressSyncing : progressSyncMessage}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={authBusy}
                onPress={handleSignOut}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {authBusy ? t.wait : t.signOut}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noticeCard}>
              <Text style={styles.cardTitle}>
                {signUpMode ? t.signUp : t.signIn}
              </Text>
              <TextInput
                accessibilityLabel={t.email}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder={t.email}
                style={styles.textInput}
                value={email}
              />
              <TextInput
                accessibilityLabel={t.password}
                autoCapitalize="none"
                autoComplete={signUpMode ? "new-password" : "current-password"}
                onChangeText={setPassword}
                placeholder={t.password}
                secureTextEntry
                style={styles.textInput}
                value={password}
              />
              <Pressable
                accessibilityRole="button"
                disabled={authBusy || !email.trim() || password.length < 8}
                onPress={handleAuthentication}
                style={[
                  styles.primaryButton,
                  (authBusy || !email.trim() || password.length < 8) && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {authBusy ? t.connecting : signUpMode ? t.signUp : t.login}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSignUpMode((current) => !current)}>
                <Text style={styles.linkText}>
                  {signUpMode ? t.alreadyAccount : t.createAccount}
                </Text>
              </Pressable>
            </View>
          )}
          {!!authMessage && <Text style={styles.statusText}>{authMessage}</Text>}
        </View>

        <View style={styles.languageSection}>
          <Text style={styles.sectionLabel}>{t.preferences}</Text>
          <Text style={styles.body}>{t.preferencesIntro}</Text>
          {preferenceFields.map((field) => (
            <View key={field.key} style={styles.preferenceCard}>
              <Text style={styles.preferenceTitle}>{t[field.title]}</Text>
              <Text style={styles.preferenceHelper}>{t[field.helper]}</Text>
              <LanguageChoice
                value={preferences[field.key]}
                onChange={(code) => updatePreference(field.key, code)}
              />
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(user) && (savingPreferences || preferencesLoading)}
            onPress={handleSavePreferences}
            style={[
              styles.primaryButton,
              Boolean(user) && (savingPreferences || preferencesLoading) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {preferencesLoading
                ? t.loadingPreferences
                : savingPreferences
                  ? t.savingPreferences
                  : t.savePreferences}
            </Text>
          </Pressable>
          {!!preferencesMessage && <Text style={styles.statusText}>{preferencesMessage}</Text>}
          {!user && (
            <Text style={styles.note}>{t.localPreferencesSaved}</Text>
          )}
        </View>

        <View style={styles.learningProfileSection}>
          <Text style={styles.sectionLabel}>{t.profileTitle}</Text>
          <Text style={styles.body}>{t.profileIntro}</Text>
          <View style={styles.preferenceCard}>
            <Text style={styles.preferenceTitle}>{t.profileName}</Text>
            <TextInput
              accessibilityLabel={t.profileName}
              maxLength={80}
              onChangeText={(value) => updateLearningProfile("displayName", value)}
              placeholder={t.profileNamePlaceholder}
              style={styles.textInput}
              value={learningProfile.displayName}
            />
            <Text style={styles.preferenceTitle}>{t.dailyGoal}</Text>
            <View style={styles.choiceList}>
              {[5, 10, 15, 20, 30].map((minutes) => (
                <Pressable
                  key={minutes}
                  accessibilityRole="button"
                  accessibilityState={{ selected: learningProfile.dailyGoalMinutes === minutes }}
                  onPress={() => updateLearningProfile("dailyGoalMinutes", minutes)}
                  style={[styles.choice, learningProfile.dailyGoalMinutes === minutes && styles.choiceSelected]}
                >
                  <Text style={styles.choiceText}>{minutes} {t.minutesUnit}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.preferenceTitle}>{t.weeklyGoal}</Text>
            <View style={styles.choiceList}>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <Pressable
                  key={days}
                  accessibilityRole="button"
                  accessibilityState={{ selected: learningProfile.weeklyGoalDays === days }}
                  onPress={() => updateLearningProfile("weeklyGoalDays", days)}
                  style={[styles.choice, learningProfile.weeklyGoalDays === days && styles.choiceSelected]}
                >
                  <Text style={styles.choiceText}>{days} {t.daysUnit}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.noticeCard}>
            <Text style={styles.cardTitle}>{t.studyTimeToday}</Text>
            <Text style={styles.resultCount}>{goalProgress.daily.current} / {goalProgress.daily.target} {t.minutesUnit}</Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={t.dailyGoal}
              accessibilityValue={{ min: 0, max: 100, now: goalProgress.daily.percent }}
              style={styles.levelTrack}
            >
              <View style={[styles.levelFill, { width: String(goalProgress.daily.percent) + "%" }]} />
            </View>
            <Text style={styles.body}>
              {goalProgress.daily.percent}% · {goalProgress.daily.completed ? t.goalCompleted : t.goalInProgress}
            </Text>
            <Text style={styles.cardTitle}>{t.studyWeekDays}</Text>
            <Text style={styles.resultCount}>{goalProgress.weekly.current} / {goalProgress.weekly.target}</Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={t.weeklyGoal}
              accessibilityValue={{ min: 0, max: 100, now: goalProgress.weekly.percent }}
              style={styles.levelTrack}
            >
              <View style={[styles.levelFill, { width: String(goalProgress.weekly.percent) + "%" }]} />
            </View>
            <Text style={styles.body}>
              {goalProgress.weekly.percent}% · {goalProgress.weekly.completed ? t.goalCompleted : t.goalInProgress}
            </Text>
            <Text style={styles.body}>{t.studyTimeNote}</Text>
          </View>
          <View style={styles.noticeCard}>
            <Text style={styles.cardTitle}>{t.learningLevel}</Text>
            <Text style={styles.resultCount}>{t[learningLevel.current.labelKey]}</Text>
            <Text style={styles.body}>{learningLevel.learned} / 30 · {t.phrasesLearned}</Text>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: String(learningLevel.progressToNext) + "%" }]} />
            </View>
            <Text style={styles.body}>
              {learningLevel.next
                ? t.nextLevel + ": " + t[learningLevel.next.labelKey] + " · " + (learningLevel.next.threshold - learningLevel.learned) + " " + t.phrasesToNextLevel
                : t.highestLevelReached}
            </Text>
          </View>
          <View style={styles.noticeCard}>
            <Text style={styles.cardTitle}>{t.dueReviews}</Text>
            <Text style={styles.resultCount}>{dueReviewCount}</Text>
            <Text style={styles.body}>{t.reviewQueueDescription}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={dueReviewCount === 0}
              onPress={() => setShowDueReviews(true)}
              style={[styles.primaryButton, dueReviewCount === 0 && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>{t.startReviews}</Text>
            </Pressable>
          </View>
          {!!learningProfileMessage && <Text style={styles.statusText}>{learningProfileMessage}</Text>}
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionLabel}>{t.features}</Text>
          <LearningPathSuggestion
            activity={nextLearningActivity}
            interfaceLanguage={preferences.interfaceLanguage}
            learningLanguage={preferences.learningLanguage}
            explanationLanguage={preferences.nativeLanguage}
            onStartReview={() => setShowDueReviews(true)}
            onStartVisual={() => setShowVocabulary(true)}
            onStartLesson={() => setShowLesson(true)}
          />
          <FeatureCard
            number="01"
            title="Learn"
            subtitle={t.learnSubtitle}
            description={t.learnDescription}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowLesson(true)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{t.startLesson}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowVocabulary(true)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {preferences.interfaceLanguage === "fi"
                ? "Harjoittele kuvien avulla"
                : preferences.interfaceLanguage === "es"
                  ? "Practicar con imágenes"
                  : "Practise with pictures"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!user) {
                setAuthMessage(t.signIn);
                return;
              }
              setShowTutor(true);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {preferences.interfaceLanguage === "fi"
                ? "Harjoittele AI-opettajan kanssa"
                : preferences.interfaceLanguage === "es"
                  ? "Practicar con el tutor de IA"
                  : "Practise with the AI tutor"}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setShowInterpreter(true)}>
            <FeatureCard
              number="02"
              title="Live"
              subtitle={t.liveSubtitle}
              description={t.liveDescription}
            />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setShowInterpreter(true)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {preferences.interfaceLanguage === "fi" ? "Avaa Live-tulkki" : preferences.interfaceLanguage === "es" ? "Abrir intérprete en directo" : "Open live interpreter"}
            </Text>
          </Pressable>
          <FeatureCard
            number="03"
            title="Understand"
            subtitle={t.understandSubtitle}
            description={t.understandDescription}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!user) {
                setAuthMessage(t.signIn);
                return;
              }
              setShowUnderstand(true);
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {preferences.interfaceLanguage === "fi" ? "Avaa kieliapuri" : preferences.interfaceLanguage === "es" ? "Abrir asistente de idiomas" : "Open language assistant"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>{t.footer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({
  number,
  title,
  subtitle,
  description,
}: {
  number: string;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureNumber}>{number}</Text>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F6F1" },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48, gap: 30 },
  header: { gap: 8 },
  eyebrow: { color: "#64736B", fontSize: 11, fontWeight: "700", letterSpacing: 2.2 },
  brand: { color: "#183D32", fontSize: 48, fontWeight: "700", letterSpacing: -2.5 },
  tagline: { color: "#52645B", fontSize: 14, lineHeight: 21 },
  intro: { gap: 10 },
  sectionLabel: { color: "#78877D", fontSize: 10, fontWeight: "700", letterSpacing: 1.7 },
  heading: { color: "#183D32", fontSize: 29, fontWeight: "700", lineHeight: 35, letterSpacing: -0.8 },
  body: { color: "#52645B", fontSize: 14, lineHeight: 22 },
  accountSection: { gap: 12 },
  languageSection: { gap: 14 },
  noticeCard: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E9E2" },
  cardTitle: { color: "#183D32", fontSize: 16, fontWeight: "700" },
  resultCount: { color: "#315D4C", fontSize: 36, fontWeight: "700" },
  levelTrack: { height: 8, borderRadius: 8, backgroundColor: "#E4E8E1", overflow: "hidden" },
  levelFill: { height: 8, borderRadius: 8, backgroundColor: "#315D4C" },
  textInput: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#D8DED7", paddingHorizontal: 12, color: "#183D32", backgroundColor: "#FFFFFF" },
  preferenceCard: { gap: 7, padding: 15, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E9E2" },
  preferenceTitle: { color: "#183D32", fontSize: 15, fontWeight: "700" },
  preferenceHelper: { color: "#7A877F", fontSize: 12 },
  choiceList: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingTop: 5 },
  choice: { borderColor: "#D8DED7", borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#FFFFFF" },
  choiceSelected: { borderColor: "#315D4C", backgroundColor: "#EAF0E9" },
  choiceText: { color: "#29483D", fontSize: 12, fontWeight: "600" },
  primaryButton: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#244E3E" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: { minHeight: 42, borderRadius: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D8DED7" },
  secondaryButtonText: { color: "#29483D", fontSize: 13, fontWeight: "600" },
  buttonDisabled: { opacity: 0.45 },
  linkText: { color: "#315D4C", fontSize: 13, fontWeight: "600", textAlign: "center", paddingVertical: 4 },
  statusText: { color: "#52645B", fontSize: 12, lineHeight: 18 },
  note: { color: "#7A877F", fontSize: 12, lineHeight: 18 },
  learningProfileSection: { gap: 14 },
  featuresSection: { gap: 12 },
  featureCard: { flexDirection: "row", gap: 16, padding: 18, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E9E2" },
  featureNumber: { color: "#A0AA9F", fontSize: 12, fontWeight: "700", paddingTop: 3 },
  featureCopy: { flex: 1, gap: 5 },
  featureTitle: { color: "#183D32", fontSize: 21, fontWeight: "700" },
  featureSubtitle: { color: "#354E43", fontSize: 14, fontWeight: "600" },
  featureDescription: { color: "#68776E", fontSize: 13, lineHeight: 20 },
  footer: { color: "#879188", fontSize: 12, lineHeight: 18, textAlign: "center" },
});
