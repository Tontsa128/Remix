import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LANGUAGES, type LanguageCode } from "../../config/languages";
import {
  STARTER_PHRASES,
  getPhraseExplanation,
  getPhraseText,
} from "../../content/initial-phrases";
import {
  loadLocalLearningProgress,
  saveLocalLearningProgress,
} from "../../services/local-learning-progress";
import { getTranslations } from "../../i18n/translations";
import type { LocalLearningProgress } from "../../types/learning";
import { createReviewQueue, recordPhraseReview } from "../../services/spaced-repetition";
import { LESSON_THEMES, getThemePhraseIds } from "../../services/lesson-themes";
import { loadStudyDays, recordStudySeconds, saveStudyDays } from "../../services/local-learning-activity";


type Props = {
  interfaceLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  learningLanguage: LanguageCode;
  onClose: () => void;
  reviewOnly?: boolean;
};

export function StarterLesson({
  interfaceLanguage,
  nativeLanguage,
  learningLanguage,
  onClose,
  reviewOnly = false,
}: Props) {
  const t = getTranslations(interfaceLanguage);
  const explanationLanguage =
    nativeLanguage !== learningLanguage
      ? nativeLanguage
      : interfaceLanguage !== learningLanguage
        ? interfaceLanguage
        : (LANGUAGES.find((language) => language.code !== learningLanguage)?.code ?? "en");
  const [progress, setProgress] = useState<LocalLearningProgress>(
    () => loadLocalLearningProgress(),
  );
  // Freeze the due-review queue for this session. Recomputing it after each
  // answer would remove the completed card and shift the next index, skipping cards.
  const [reviewQueue] = useState<string[]>(() =>
    reviewOnly ? createReviewQueue(progress) : [],
  );
  const [selectedTheme, setSelectedTheme] = useState<string | null>(reviewOnly ? "all" : null);
  const phraseIds = reviewOnly
    ? reviewQueue
    : selectedTheme
      ? getThemePhraseIds(selectedTheme)
      : [];
  const [sessionKnownCount, setSessionKnownCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");
  const [finished, setFinished] = useState(reviewOnly && phraseIds.length === 0);
  const [saveError, setSaveError] = useState(false);
  const activeSince = useRef<number | null>(null);

  useEffect(() => {
    if (finished || phraseIds.length === 0 || (!reviewOnly && selectedTheme === null)) return;

    const flushActiveTime = () => {
      if (activeSince.current === null) return;
      const elapsedSeconds = Math.floor((Date.now() - activeSince.current) / 1000);
      activeSince.current = Date.now();
      if (elapsedSeconds <= 0) return;
      const nextDays = recordStudySeconds(loadStudyDays(), elapsedSeconds);
      saveStudyDays(nextDays);
    };

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        activeSince.current = Date.now();
      } else {
        flushActiveTime();
        activeSince.current = null;
      }
    };

    if (AppState.currentState === "active") activeSince.current = Date.now();
    const subscription = AppState.addEventListener("change", handleAppState);
    const interval = setInterval(() => {
      if (AppState.currentState === "active") flushActiveTime();
    }, 15000);

    return () => {
      flushActiveTime();
      activeSince.current = null;
      clearInterval(interval);
      subscription.remove();
    };
  }, [finished, phraseIds.length, reviewOnly, selectedTheme]);

  const phrase = STARTER_PHRASES.find((item) => item.id === phraseIds[index]) ?? STARTER_PHRASES[0]!;
  const percent = phraseIds.length > 0
    ? Math.round(((index + 1) / phraseIds.length) * 100)
    : 100;

  function recordAnswer(knewIt: boolean) {
    if (!phrase) return;
    const next = recordPhraseReview(progress, phrase.id, knewIt);
    if (knewIt) setSessionKnownCount((count) => count + 1);
    setProgress(next);
    setSaveError(!saveLocalLearningProgress(next));

    if (index + 1 >= phraseIds.length) {
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
    setRevealed(false);
    setAnswerDraft("");
  }

  function restartLesson() {
    setIndex(0);
    setSessionKnownCount(0);
    setRevealed(false);
    setAnswerDraft("");
    setFinished(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>ELOVIO · LEARN</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t.closeLesson}</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>{reviewOnly ? t.reviewTitle : t.lessonTitle}</Text>
        <Text style={styles.body}>{reviewOnly ? t.reviewIntro : t.lessonIntro}</Text>
        {saveError && <Text style={styles.body}>{t.localProgressSaveFailed}</Text>}

        {!reviewOnly && selectedTheme === null ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t.chooseLessonTheme}</Text>
            {LESSON_THEMES.map((theme) => (
              <Pressable
                key={theme.id}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedTheme(theme.id);
                  setIndex(0);
                  setRevealed(false);
                  setAnswerDraft("");
                  setFinished(false);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{t[theme.labelKey]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selectedTheme !== null && (finished ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{phraseIds.length === 0 ? t.noReviewsDue : t.lessonFinished}</Text>
            {phraseIds.length > 0 && (
              <>
                <Text style={styles.resultCount}>
                  {sessionKnownCount} / {phraseIds.length}
                </Text>
                <Text style={styles.body}>{t.knownCount}</Text>
                {!reviewOnly && (
                  <Pressable accessibilityRole="button" onPress={restartLesson} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{t.reviewAgain}</Text>
                  </Pressable>
                )}
              </>
            )}
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t.closeLesson}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>{t.progressLabel}</Text>
              <Text style={styles.progressText}>
                {index + 1} / {phraseIds.length}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>

            <View style={styles.flashcard}>
              <Text style={styles.cardLabel}>{explanationLanguage.toUpperCase()}</Text>
              <Text style={styles.phrase}>
                {getPhraseText(phrase, explanationLanguage)}
              </Text>
              {!revealed ? (
                <>
                  <Text style={styles.answerLabel}>{t.writeAnswerPrompt}</Text>
                  <TextInput
                    accessibilityLabel={t.answerInputLabel}
                    value={answerDraft}
                    onChangeText={setAnswerDraft}
                    placeholder={t.answerInputPlaceholder}
                    placeholderTextColor="#879188"
                    autoCapitalize="sentences"
                    autoCorrect
                    returnKeyType="done"
                    multiline
                    textAlignVertical="top"
                    style={styles.answerInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRevealed(true)}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>{t.showTranslation}</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.answer}>
                  <Text style={styles.answerLabel}>{learningLanguage.toUpperCase()}</Text>
                  <Text style={styles.translation}>
                    {getPhraseText(phrase, learningLanguage)}
                  </Text>
                  {answerDraft.trim().length > 0 && (
                    <>
                      <Text style={styles.explanationLabel}>{t.yourAnswer}</Text>
                      <Text style={styles.explanation}>{answerDraft.trim()}</Text>
                    </>
                  )}
                  <Text style={styles.explanationLabel}>{t.explanationLabel}</Text>
                  <Text style={styles.explanation}>
                    {getPhraseExplanation(phrase, explanationLanguage)}
                  </Text>
                </View>
              )}
            </View>

            {revealed && (
              <View style={styles.answerActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => recordAnswer(false)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>{t.markDifficult}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => recordAnswer(true)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>
                    {index + 1 === phraseIds.length ? t.lessonFinished : t.markKnown}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F6F1" },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48, gap: 18 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  eyebrow: { color: "#64736B", fontSize: 11, fontWeight: "700", letterSpacing: 1.8 },
  closeButton: { paddingVertical: 8, paddingHorizontal: 10 },
  closeText: { color: "#315D4C", fontSize: 12, fontWeight: "700" },
  heading: { color: "#183D32", fontSize: 27, lineHeight: 34, fontWeight: "700" },
  body: { color: "#52645B", fontSize: 14, lineHeight: 22 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { color: "#52645B", fontSize: 12, fontWeight: "600" },
  progressTrack: { height: 7, borderRadius: 8, backgroundColor: "#E4E8E1", overflow: "hidden" },
  progressFill: { height: 7, borderRadius: 8, backgroundColor: "#315D4C" },
  flashcard: { gap: 18, padding: 22, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E9E2", minHeight: 270, justifyContent: "center" },
  cardLabel: { color: "#879188", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textAlign: "center" },
  phrase: { color: "#183D32", fontSize: 30, lineHeight: 38, fontWeight: "700", textAlign: "center" },
  answer: { gap: 9, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E7E9E2" },
  answerLabel: { color: "#879188", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textAlign: "center" },
  translation: { color: "#315D4C", fontSize: 23, lineHeight: 30, fontWeight: "700", textAlign: "center" },
  answerInput: { minHeight: 92, maxHeight: 150, borderWidth: 1, borderColor: "#D8DED7", borderRadius: 12, padding: 14, color: "#183D32", fontSize: 16, lineHeight: 23, backgroundColor: "#FAFBF8" },
  explanationLabel: { color: "#78877D", fontSize: 10, fontWeight: "700", letterSpacing: 1.2, paddingTop: 6 },
  explanation: { color: "#52645B", fontSize: 13, lineHeight: 20, textAlign: "center" },
  primaryButton: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#244E3E" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D8DED7", backgroundColor: "#FFFFFF" },
  secondaryButtonText: { color: "#29483D", fontSize: 14, fontWeight: "700" },
  answerActions: { gap: 10 },
  resultCard: { marginTop: 24, padding: 22, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E9E2", gap: 14 },
  resultTitle: { color: "#183D32", fontSize: 22, fontWeight: "700", textAlign: "center" },
  resultCount: { color: "#315D4C", fontSize: 42, fontWeight: "700", textAlign: "center" },
});
