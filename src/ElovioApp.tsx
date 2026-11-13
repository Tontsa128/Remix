import { useCallback, useEffect, useState } from "react";
import { Check, Headphones, Settings, Share2, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { SettingsModal } from "@/components/SettingsModal";
import { ALL_SENTENCES, LANGUAGE_LABELS, LESSONS } from "@/data/lessons";
import {
  getActiveSession,
  signInWithGoogle,
  signOut,
} from "@/lib/auth-service";
import { ExercisePlayerScreen } from "@/screens/ExercisePlayerScreen";
import { ExercisesScreen } from "@/screens/ExercisesScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { InterpreterScreen } from "@/screens/InterpreterScreen";
import {
  type ContinuousListenRequest,
  ListenScreen,
} from "@/screens/ListenScreen";
import { TutorScreen } from "@/screens/TutorScreen";
import {
  Audio as BackgroundAudio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "@/services/expo-av-background";
import { checkMicPermission } from "@/services/mic";
import {
  buildShareLearningUrl,
  copyTextToClipboard,
  getSnapshotLevel,
  mergeSharedSnapshot,
  parseSharePayloadFromSearch,
  type SharedLearningSnapshot,
} from "@/services/share-link";
import { unlockSpeechSynthesis } from "@/services/speech";
import {
  addLiveSeconds,
  addStudySeconds,
  enqueueSentenceReview,
  getComputedLevel,
  getDueReviewItems,
  getRemainingLiveSeconds,
  loadProgress,
  markSentenceLearned,
  recordLessonResults,
  resetProgress,
  saveProgress,
} from "@/services/storage";
import type {
  AccountUser,
  Lesson,
  MicPermissionState,
  TabId,
  UserPreferences,
  UserProgressState,
} from "@/types/elovio";

function buildReviewLesson(progress: UserProgressState): Lesson | null {
  const due = getDueReviewItems(progress);
  if (due.length === 0) return null;

  const dueIds = new Set(due.map((d) => d.sentenceId));
  const sentences = LESSONS.flatMap((l) => l.sentences).filter((s) =>
    dueIds.has(s.id),
  );
  if (sentences.length === 0) return null;

  return {
    id: "review-session",
    title: "Päivän kertaus",
    subtitle: "Aiemmin haastavat ilmaisut",
    category: "Arki",
    difficulty: "Helppo",
    estimatedMinutes: Math.max(2, Math.ceil(sentences.length * 0.5)),
    sentences,
  };
}

function getNextRecommendedLesson(progress: UserProgressState): Lesson {
  const completed = new Set(progress.completedLessonIds);
  const next = LESSONS.find((l) => !completed.has(l.id));
  return next ?? LESSONS[0]!;
}

export default function ElovioApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [progress, setProgress] = useState<UserProgressState>(() =>
    loadProgress(null),
  );
  const [activeExercise, setActiveExercise] = useState<{
    lesson: Lesson;
    isReview: boolean;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [micPermission, setMicPermission] =
    useState<MicPermissionState>("unknown");
  const [continuousPlayRequest, setContinuousPlayRequest] =
    useState<ContinuousListenRequest | null>(null);
  const [listenDeckId, setListenDeckId] = useState<string>("all-words");
  const [listenAudioOnly, setListenAudioOnly] = useState<boolean>(false);
  const [pendingSharedPath, setPendingSharedPath] =
    useState<SharedLearningSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    const incomingShare = parseSharePayloadFromSearch(window.location.search);
    if (incomingShare) {
      setPendingSharedPath(incomingShare);
    }

    void (async () => {
      try {
        const session = await getActiveSession();
        if (!mounted) return;
        const account = (session?.user as AccountUser | null) ?? null;
        setUser(account);
        setProgress(loadProgress(account?.id ?? null));
      } catch {
        if (mounted) setProgress(loadProgress(null));
      }
    })();

    void checkMicPermission().then((perm) => {
      if (mounted) setMicPermission(perm);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const updateAndPersist = useCallback(
    (updater: (prev: UserProgressState) => UserProgressState) => {
      setProgress((prev) => {
        const next = updater(prev);
        saveProgress(next, user?.id ?? null);
        return next;
      });
    },
    [user?.id],
  );

  const handlePreferencesChange = (nextPrefs: UserPreferences) => {
    updateAndPersist((prev) => ({
      ...prev,
      preferences: nextPrefs,
    }));
  };

  const handleContinueExercise = () => {
    const reviewLesson = buildReviewLesson(progress);
    if (reviewLesson) {
      setActiveExercise({ lesson: reviewLesson, isReview: true });
      return;
    }
    setActiveExercise({
      lesson: getNextRecommendedLesson(progress),
      isReview: false,
    });
  };

  const handleStartReview = () => {
    const reviewLesson = buildReviewLesson(progress);
    if (reviewLesson) {
      setActiveExercise({ lesson: reviewLesson, isReview: true });
    }
  };

  const handleStartContinuousListening = useCallback(() => {
    unlockSpeechSynthesis();
    void BackgroundAudio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    setActiveExercise(null);
    setSettingsOpen(false);
    setActiveTab("listen");
    setContinuousPlayRequest({
      nonce: Date.now(),
      deckId: "all-course",
      enableLoop: true,
      audioOnlySchool: false,
    });
  }, []);

  const handleStartListeningSchool = useCallback(() => {
    unlockSpeechSynthesis();
    void BackgroundAudio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    setActiveExercise(null);
    setSettingsOpen(false);
    setActiveTab("listen");
    setContinuousPlayRequest({
      nonce: Date.now(),
      deckId: "all-course",
      enableLoop: true,
      audioOnlySchool: true,
    });
  }, []);

  const handleConsumeLiveSeconds = useCallback(
    (secs: number) => {
      updateAndPersist((prev) => addLiveSeconds(prev, secs));
    },
    [updateAndPersist],
  );

  const handleAddStudySeconds = useCallback(
    (secs: number) => {
      updateAndPersist((prev) => addStudySeconds(prev, secs));
    },
    [updateAndPersist],
  );

  const handleMarkLearned = useCallback(
    (sentenceId: string) => {
      updateAndPersist((prev) => markSentenceLearned(prev, sentenceId));
    },
    [updateAndPersist],
  );

  const handleEnqueueReview = useCallback(
    (sentenceId: string, lessonId: string) => {
      updateAndPersist((prev) =>
        enqueueSentenceReview(prev, { sentenceId, lessonId }),
      );
    },
    [updateAndPersist],
  );

  const handleGoogleSignIn = async () => {
    const res = await signInWithGoogle();
    if (res?.user) {
      const account = res.user as AccountUser;
      setUser(account);
      setProgress(loadProgress(account.id));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setProgress(loadProgress(null));
  };

  const handleResetProgress = () => {
    const fresh = resetProgress(user?.id ?? null);
    setProgress(fresh);
  };

  const clearShareQueryFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.location.search.includes("path=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleShareLearningPath = useCallback(async (): Promise<{
    url: string;
    copied: boolean;
  }> => {
    const url = buildShareLearningUrl({
      progress,
      activeTab,
      activeDeckId: listenDeckId,
      audioOnlySchool: listenAudioOnly,
    });
    const copied = await copyTextToClipboard(url);
    return { url, copied };
  }, [activeTab, listenAudioOnly, listenDeckId, progress]);

  const handleAcceptSharedPath = useCallback(() => {
    if (!pendingSharedPath) return;
    const snapshot = pendingSharedPath;
    updateAndPersist((prev) => mergeSharedSnapshot(prev, snapshot));
    setActiveTab(snapshot.tab);
    if (snapshot.tab === "listen" && snapshot.deck) {
      setContinuousPlayRequest({
        nonce: Date.now(),
        deckId: snapshot.deck,
        enableLoop: true,
        audioOnlySchool: Boolean(snapshot.audioOnly),
      });
    }
    setPendingSharedPath(null);
    clearShareQueryFromUrl();
  }, [clearShareQueryFromUrl, pendingSharedPath, updateAndPersist]);

  const handleDismissSharedPath = useCallback(() => {
    setPendingSharedPath(null);
    clearShareQueryFromUrl();
  }, [clearShareQueryFromUrl]);

  const level = getComputedLevel(progress);
  const remainingLiveSeconds = getRemainingLiveSeconds(progress);

  return (
    <ErrorBoundary>
      <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#FAF9F6] text-[#142620]">
        {/* Kompakti yläpalkki */}
        <header className="sticky top-0 z-30 border-b border-[#DDE5E0] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="text-lg font-extrabold tracking-tight text-[#1E3F35]">
                Elovio
              </span>
              <span className="truncate text-xs font-medium text-[#4A5D55]">
                {LANGUAGE_LABELS[progress.preferences.nativeLanguage]} →{" "}
                {LANGUAGE_LABELS[progress.preferences.targetLanguage]}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartContinuousListening}
                aria-label="Kuuntele ja opiskele kieliä yhtäsoittoa"
                className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors ${
                  activeTab === "listen" && continuousPlayRequest
                    ? "bg-[#2D6A4F] text-white"
                    : "bg-[#1E3F35] text-white hover:bg-[#17322A]"
                }`}
              >
                <Headphones size={16} aria-hidden="true" />
                <span>Yhtäsoittoa</span>
              </button>
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => {
                  void checkMicPermission().then(setMicPermission);
                  setSettingsOpen(true);
                }}
                aria-label="Asetukset"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#1E3F35] transition-colors hover:bg-[#EFF5F1]"
              >
                <Settings size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {/* Yksi näkymä kerrallaan */}
        <main className="flex-1">
          {pendingSharedPath && (
            <div className="mx-auto mt-3 max-w-3xl px-4">
              <div className="rounded-2xl border border-[#2D6A4F] bg-[#EAF2EE] p-4 text-[#142620] shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E3F35] text-white">
                      <Share2 size={16} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        Jaettu oppimispolku (
                        {LANGUAGE_LABELS[pendingSharedPath.n]} →{" "}
                        {LANGUAGE_LABELS[pendingSharedPath.t]})
                      </p>
                      <p className="mt-0.5 text-xs text-[#385348]">
                        Taso: {getSnapshotLevel(pendingSharedPath)} ·{" "}
                        {pendingSharedPath.l.length} / {ALL_SENTENCES.length}{" "}
                        ilmaisua opittu · tavoite {pendingSharedPath.g} min/pv
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissSharedPath}
                    aria-label="Sulje jaettu polku"
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#4A5D55] hover:bg-white/60"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptSharedPath}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#1E3F35] px-4 text-xs font-bold text-white hover:bg-[#17322A]"
                  >
                    <Check size={15} aria-hidden="true" />
                    <span>Ota oppimispolku käyttöön</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissSharedPath}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-[#C6D6CE] bg-white px-3.5 text-xs font-semibold text-[#142620]"
                  >
                    Ohita
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "home" && (
            <HomeScreen
              progress={progress}
              onContinueExercise={handleContinueExercise}
              onStartListeningSchool={handleStartListeningSchool}
              onShareLearningPath={handleShareLearningPath}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === "listen" && (
            <ListenScreen
              progress={progress}
              autoPlayRequest={continuousPlayRequest}
              onChangePreferences={handlePreferencesChange}
              onAddStudySeconds={handleAddStudySeconds}
              onMarkLearned={handleMarkLearned}
              onEnqueueReview={handleEnqueueReview}
              onShareListeningPath={handleShareLearningPath}
              onListenStateChange={(deckId, audioOnly) => {
                setListenDeckId(deckId);
                setListenAudioOnly(audioOnly);
              }}
            />
          )}

          {activeTab === "exercises" && (
            <ExercisesScreen
              progress={progress}
              onStartLesson={(lesson) =>
                setActiveExercise({ lesson, isReview: false })
              }
              onStartReview={handleStartReview}
            />
          )}

          {activeTab === "interpreter" && (
            <InterpreterScreen
              nativeLanguage={progress.preferences.nativeLanguage}
              targetLanguage={progress.preferences.targetLanguage}
              remainingLiveSeconds={remainingLiveSeconds}
              onConsumeLiveSeconds={handleConsumeLiveSeconds}
            />
          )}

          {activeTab === "tutor" && (
            <TutorScreen
              nativeLanguage={progress.preferences.nativeLanguage}
              targetLanguage={progress.preferences.targetLanguage}
              level={level}
            />
          )}
        </main>

        {/* Koko ruudun harjoitusnäkymä */}
        {activeExercise && (
          <ExercisePlayerScreen
            lesson={activeExercise.lesson}
            nativeLanguage={progress.preferences.nativeLanguage}
            targetLanguage={progress.preferences.targetLanguage}
            isReviewMode={activeExercise.isReview}
            onComplete={(result) => {
              updateAndPersist((prev) => recordLessonResults(prev, result));
            }}
            onClose={() => setActiveExercise(null)}
          />
        )}

        {/* Asetukset */}
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          preferences={progress.preferences}
          onChangePreferences={handlePreferencesChange}
          user={user}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          micPermission={micPermission}
          onResetProgress={handleResetProgress}
          onShareLearningPath={handleShareLearningPath}
          learnedCount={progress.learnedSentenceIds.length}
        />

        {/* Offline-ilmaisin */}
        <OfflineIndicator />

        {/* 4-välilehtinen alapalkki */}
        <BottomNav activeTab={activeTab} onSelect={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
}
