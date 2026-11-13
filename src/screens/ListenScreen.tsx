import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  Check,
  CloudDownload,
  Download,
  Eye,
  EyeOff,
  Headphones,
  Moon,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Volume2,
} from "lucide-react";
import {
  ALL_SENTENCES,
  LANGUAGE_LABELS,
  LESSONS,
  SENTENCE_LESSONS,
  VOCAB_PACKS,
  findLessonIdForSentenceId,
} from "@/data/lessons";
import {
  clearAllOfflineAudio,
  fetchAudioCatalog,
  getOfflineStorageSummary,
  getPackCachedTrackCount,
  precacheAudioPack,
  preloadUpcomingTracks,
  speakPhraseWithStudioAudio,
  stopSharedMp3Playback,
} from "@/services/audio-library";
import {
  acquireScreenWakeLock,
  bindEarbudHardwareControls,
  isWakeLockSupported,
  releaseScreenWakeLock,
  updateEarbudMediaSession,
} from "@/services/audio-player";
import {
  Audio as BackgroundAudio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  playBackgroundSilenceGap,
} from "@/services/expo-av-background";
import {
  cancelSpeech,
  speakText,
  unlockSpeechSynthesis,
  waitPause,
} from "@/services/speech";
import { getDueReviewItems } from "@/services/storage";
import type {
  LanguageCode,
  Lesson,
  LessonSentence,
  ListeningStyle,
  UserPreferences,
  UserProgressState,
} from "@/types/elovio";

export interface ContinuousListenRequest {
  nonce: number;
  deckId?: string;
  enableLoop?: boolean;
  audioOnlySchool?: boolean;
}

interface ListenScreenProps {
  progress: UserProgressState;
  autoPlayRequest?: ContinuousListenRequest | null;
  onChangePreferences: (prefs: UserPreferences) => void;
  onAddStudySeconds: (seconds: number) => void;
  onMarkLearned: (sentenceId: string) => void;
  onEnqueueReview: (sentenceId: string, lessonId: string) => void;
  onShareListeningPath?: () => Promise<{ url: string; copied: boolean }>;
  onListenStateChange?: (deckId: string, audioOnly: boolean) => void;
}

type PlaylistFilter =
  | "Kaikki"
  | "Sanat"
  | "Lauseet"
  | "Matkustus"
  | "Ruoka & juoma"
  | "Terveys"
  | "Arki";

const PLAYLIST_FILTERS: PlaylistFilter[] = [
  "Kaikki",
  "Sanat",
  "Lauseet",
  "Matkustus",
  "Ruoka & juoma",
  "Terveys",
  "Arki",
];

type PlaybackPhase =
  | "idle"
  | "native"
  | "thinking"
  | "target_1"
  | "target_2"
  | "finished";

const PHASE_LABELS: Record<PlaybackPhase, string> = {
  idle: "Valmis kuunteluun",
  native: "Tuttu kieli",
  thinking: "Mieti mielessäsi...",
  target_1: "Kohdekieli (1/2)",
  target_2: "Kohdekieli (2/2)",
  finished: "Soittolista valmis",
};

const STYLE_OPTIONS: Array<{
  id: ListeningStyle;
  title: string;
  desc: string;
}> = [
  {
    id: "active_recall",
    title: "Aktiivinen muistelu",
    desc: "Tuttu kieli → tauko → kohdekieli ×2",
  },
  {
    id: "comprehension",
    title: "Kuuntele & ymmärrä",
    desc: "Kohdekieli → tauko → tuttu kieli",
  },
  {
    id: "immersion",
    title: "Kielikylpy",
    desc: "Vain kohdekieli (hidas + normaali)",
  },
];

const TARGET_LANG_CHOICES: Array<{ code: LanguageCode; label: string }> = [
  { code: "es", label: "Espanja" },
  { code: "en", label: "Englanti" },
  { code: "fi", label: "Suomi" },
];

function shuffleItems<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function getPronunciationForTarget(
  sentence: LessonSentence,
  targetLang: LanguageCode,
): string | null {
  const specific = sentence.pronunciationHints?.[targetLang];
  if (specific) return specific;
  if (targetLang === "es" && sentence.pronunciationHint.trim()) {
    return sentence.pronunciationHint;
  }
  return null;
}

export function ListenScreen({
  progress,
  autoPlayRequest,
  onChangePreferences,
  onAddStudySeconds,
  onMarkLearned,
  onEnqueueReview,
  onShareListeningPath,
  onListenStateChange,
}: ListenScreenProps) {
  const nativeLang = progress.preferences.nativeLanguage;
  const targetLang = progress.preferences.targetLanguage;

  const [selectedDeckId, setSelectedDeckId] = useState<string>("all-words");
  const [filter, setFilter] = useState<PlaylistFilter>("Kaikki");
  const [style, setStyle] = useState<ListeningStyle>("active_recall");
  const [preferStudioMp3, setPreferStudioMp3] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [thinkPauseMs, setThinkPauseMs] = useState<number>(2000);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [shuffleEnabled, setShuffleEnabled] = useState<boolean>(false);
  const [autoMarkLearned, setAutoMarkLearned] = useState<boolean>(false);
  const [hideTranslation, setHideTranslation] = useState<boolean>(false);
  const [audioSchoolOnly, setAudioSchoolOnly] = useState<boolean>(false);
  const [keepScreenAwake, setKeepScreenAwake] = useState<boolean>(false);
  const [sleepMinutes, setSleepMinutes] = useState<number>(0);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const [sleepRemainingMin, setSleepRemainingMin] = useState<number | null>(
    null,
  );
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [phase, setPhase] = useState<PlaybackPhase>("idle");
  const [activeAudioEngine, setActiveAudioEngine] = useState<"mp3" | "device">(
    "mp3",
  );
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  // Server audio catalog & IndexedDB offline storage state
  const [catalogTotalTracks, setCatalogTotalTracks] = useState<number>(
    ALL_SENTENCES.length,
  );
  const [catalogSynced, setCatalogSynced] = useState<boolean>(false);
  const [cacheStatus, setCacheStatus] = useState<{
    cached: number;
    total: number;
  }>({ cached: 0, total: 0 });
  const [offlineStats, setOfflineStats] = useState<{
    count: number;
    totalBytes: number;
  }>({ count: 0, totalBytes: 0 });
  const [downloadingPack, setDownloadingPack] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const precacheAbortRef = useRef<AbortController | null>(null);
  const playLoopGenerationRef = useRef<number>(0);
  const activeSecondsAccRef = useRef<number>(0);
  const lastHandledNonceRef = useRef<number | null>(null);

  const dueItems = useMemo(() => getDueReviewItems(progress), [progress]);
  const learnedSet = useMemo(
    () => new Set(progress.learnedSentenceIds),
    [progress.learnedSentenceIds],
  );
  const reviewSet = useMemo(
    () => new Set(progress.reviewQueue.map((r) => r.sentenceId)),
    [progress.reviewQueue],
  );

  // Sync audio catalog metadata from /api/audio-catalog
  useEffect(() => {
    const controller = new AbortController();
    void fetchAudioCatalog({
      nativeLang,
      targetLang,
      signal: controller.signal,
    }).then(({ catalog, fromServer }) => {
      if (controller.signal.aborted) return;
      setCatalogTotalTracks(catalog.totalTracks);
      setCatalogSynced(fromServer);
    });
    return () => controller.abort();
  }, [nativeLang, targetLang]);

  const deckDefinitions = useMemo(() => {
    const dueIds = new Set(dueItems.map((d) => d.sentenceId));
    const reviewSentences = ALL_SENTENCES.filter((s) => dueIds.has(s.id));

    const allWords = VOCAB_PACKS.flatMap((p) => p.sentences);
    const allSentenceItems = SENTENCE_LESSONS.flatMap((l) => l.sentences);

    const quickCollections: Array<{
      id: string;
      title: string;
      subtitle: string;
      items: LessonSentence[];
      badge: string;
      isSingleLesson: boolean;
    }> = [
      {
        id: "all-words",
        title: "Kaikki perussanat",
        subtitle: `${allWords.length} tärkeintä arjen sanaa korvanapeille`,
        items: allWords,
        badge: "Sanasto",
        isSingleLesson: false,
      },
      {
        id: "all-sentences",
        title: "Kaikki arkilauseet",
        subtitle: `${allSentenceItems.length} matkailun ja arjen lausetta`,
        items: allSentenceItems,
        badge: "Lauseet",
        isSingleLesson: false,
      },
      {
        id: "all-course",
        title: "Koko kurssi (maraton)",
        subtitle: "Kaikki sanat ja lauseet yhtä soittoa",
        items: ALL_SENTENCES,
        badge: "Kaikki",
        isSingleLesson: false,
      },
    ];

    if (reviewSentences.length > 0) {
      quickCollections.splice(2, 0, {
        id: "review-due",
        title: "Kertausjono",
        subtitle: "Vaikeiksi merkityt ja väärin menneet",
        items: reviewSentences,
        badge: "Kertaus",
        isSingleLesson: false,
      });
    }

    return { quickCollections };
  }, [dueItems]);

  const activeDeckMeta = useMemo(() => {
    const quick = deckDefinitions.quickCollections.find(
      (q) => q.id === selectedDeckId,
    );
    if (quick) return quick;
    const lesson = LESSONS.find((l) => l.id === selectedDeckId) ?? LESSONS[0]!;
    return {
      id: lesson.id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      items: lesson.sentences,
      badge: lesson.kind === "word" ? "Sanasto" : lesson.category,
      isSingleLesson: true,
    };
  }, [deckDefinitions.quickCollections, selectedDeckId]);

  const playlist = useMemo(() => {
    const base = activeDeckMeta.items;
    return shuffleEnabled ? shuffleItems(base) : base;
  }, [activeDeckMeta.items, shuffleEnabled]);

  const safeIndex =
    playlist.length === 0 ? 0 : Math.min(currentIndex, playlist.length - 1);
  const currentItem = playlist[safeIndex];

  const filteredPacks: Lesson[] = useMemo(() => {
    if (filter === "Kaikki") return LESSONS;
    if (filter === "Sanat") return LESSONS.filter((l) => l.kind === "word");
    if (filter === "Lauseet")
      return LESSONS.filter((l) => l.kind !== "word");
    return LESSONS.filter((l) => l.category === filter);
  }, [filter]);

  const refreshCacheStatus = useCallback(() => {
    const langs: LanguageCode[] =
      style === "immersion" ? [targetLang] : [nativeLang, targetLang];
    void getPackCachedTrackCount(activeDeckMeta.items, langs).then(
      setCacheStatus,
    );
    void getOfflineStorageSummary().then(setOfflineStats);
  }, [activeDeckMeta.items, nativeLang, style, targetLang]);

  useEffect(() => {
    refreshCacheStatus();
  }, [refreshCacheStatus, currentIndex]);

  useEffect(() => {
    onListenStateChange?.(selectedDeckId, audioSchoolOnly);
  }, [audioSchoolOnly, onListenStateChange, selectedDeckId]);

  useEffect(() => {
    if (
      !autoPlayRequest ||
      lastHandledNonceRef.current === autoPlayRequest.nonce
    ) {
      return;
    }
    lastHandledNonceRef.current = autoPlayRequest.nonce;
    unlockSpeechSynthesis();
    void BackgroundAudio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    if (autoPlayRequest.audioOnlySchool === true) {
      setAudioSchoolOnly(true);
      setHideTranslation(true);
      setShowSettings(false);
    } else if (autoPlayRequest.audioOnlySchool === false) {
      setAudioSchoolOnly(false);
    }
    if (autoPlayRequest.deckId && autoPlayRequest.deckId !== selectedDeckId) {
      setSelectedDeckId(autoPlayRequest.deckId);
      setCurrentIndex(0);
    } else if (phase === "finished") {
      setCurrentIndex(0);
    }
    if (autoPlayRequest.enableLoop) {
      setLoopEnabled(true);
    }
    setIsPlaying(true);
  }, [autoPlayRequest, phase, selectedDeckId]);

  const stopPlayback = useCallback(
    (nextPhase: PlaybackPhase = "idle") => {
      playLoopGenerationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      stopSharedMp3Playback();
      cancelSpeech();
      setIsPlaying(false);
      setPhase(nextPhase);
      if (activeSecondsAccRef.current > 0) {
        onAddStudySeconds(activeSecondsAccRef.current);
        activeSecondsAccRef.current = 0;
      }
      updateEarbudMediaSession({
        title: activeDeckMeta.title,
        artist: LANGUAGE_LABELS[targetLang],
        album: "Elovio Kuunteluopetus",
        playbackState: "paused",
      });
    },
    [activeDeckMeta.title, onAddStudySeconds, targetLang],
  );

  // Stop audio & downloads cleanly on unmount
  useEffect(() => {
    return () => {
      playLoopGenerationRef.current += 1;
      abortRef.current?.abort();
      precacheAbortRef.current?.abort();
      stopSharedMp3Playback();
      cancelSpeech();
      void releaseScreenWakeLock();
      if (activeSecondsAccRef.current > 0) {
        onAddStudySeconds(activeSecondsAccRef.current);
        activeSecondsAccRef.current = 0;
      }
    };
  }, [onAddStudySeconds]);

  // Accumulate study time every second while playing, flush every 10s
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      activeSecondsAccRef.current += 1;
      if (activeSecondsAccRef.current >= 10) {
        onAddStudySeconds(activeSecondsAccRef.current);
        activeSecondsAccRef.current = 0;
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, onAddStudySeconds]);

  // Sleep timer handling
  useEffect(() => {
    if (!sleepEndsAt || !isPlaying) {
      setSleepRemainingMin(
        sleepEndsAt
          ? Math.max(1, Math.ceil((sleepEndsAt - Date.now()) / 60000))
          : null,
      );
      return;
    }

    const tick = () => {
      const diff = sleepEndsAt - Date.now();
      if (diff <= 0) {
        setSleepEndsAt(null);
        setSleepMinutes(0);
        setSleepRemainingMin(null);
        stopPlayback("idle");
      } else {
        setSleepRemainingMin(Math.max(1, Math.ceil(diff / 60000)));
      }
    };

    tick();
    const timer = window.setInterval(tick, 5000);
    return () => window.clearInterval(timer);
  }, [isPlaying, sleepEndsAt, stopPlayback]);

  // Screen wake lock toggle
  useEffect(() => {
    if (isPlaying && keepScreenAwake) {
      void acquireScreenWakeLock();
    } else {
      void releaseScreenWakeLock();
    }
  }, [isPlaying, keepScreenAwake]);

  // Main sequential background MP3/audio playback loop (screen-off safe)
  useEffect(() => {
    if (!isPlaying || playlist.length === 0) return;

    const gen = ++playLoopGenerationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    void BackgroundAudio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const pacePause = async (ms: number) => {
      if (preferStudioMp3) {
        await playBackgroundSilenceGap(ms, signal);
      } else {
        await waitPause(ms, signal);
      }
    };

    const speakSegment = async (
      phrase: string,
      lang: LanguageCode,
      rate: number,
    ) => {
      const engine = await speakPhraseWithStudioAudio(phrase, lang, {
        rate,
        preferStudioMp3,
        signal,
      });
      if (!signal.aborted) {
        setActiveAudioEngine(engine);
      }
    };

    const runLoop = async () => {
      let idx = safeIndex;

      while (!signal.aborted && gen === playLoopGenerationRef.current) {
        const item = playlist[idx];
        if (!item) break;

        setCurrentIndex(idx);
        if (preferStudioMp3) {
          preloadUpcomingTracks(
            playlist,
            idx,
            style === "immersion" ? [targetLang] : [nativeLang, targetLang],
          );
        }

        updateEarbudMediaSession({
          title: item[targetLang],
          artist: `${item[nativeLang]} · ${idx + 1}/${playlist.length}`,
          album: activeDeckMeta.title,
          playbackState: "playing",
        });

        if (style === "active_recall") {
          setPhase("native");
          await speakSegment(
            item[nativeLang],
            nativeLang,
            Math.min(1.08, speechRate + 0.05),
          );
          if (signal.aborted) break;

          if (thinkPauseMs > 0) {
            setPhase("thinking");
            await pacePause(thinkPauseMs);
            if (signal.aborted) break;
          }

          setPhase("target_1");
          await speakSegment(item[targetLang], targetLang, speechRate);
          if (signal.aborted) break;

          await pacePause(650);
          if (signal.aborted) break;

          setPhase("target_2");
          await speakSegment(
            item[targetLang],
            targetLang,
            Math.min(1.15, speechRate + 0.06),
          );
          if (signal.aborted) break;
        } else if (style === "comprehension") {
          setPhase("target_1");
          await speakSegment(item[targetLang], targetLang, speechRate);
          if (signal.aborted) break;

          if (thinkPauseMs > 0) {
            setPhase("thinking");
            await pacePause(thinkPauseMs);
            if (signal.aborted) break;
          }

          setPhase("native");
          await speakSegment(
            item[nativeLang],
            nativeLang,
            Math.min(1.08, speechRate + 0.05),
          );
          if (signal.aborted) break;
        } else {
          // immersion: target x2 (slow then natural)
          setPhase("target_1");
          await speakSegment(
            item[targetLang],
            targetLang,
            Math.max(0.7, speechRate - 0.14),
          );
          if (signal.aborted) break;

          await pacePause(700);
          if (signal.aborted) break;

          setPhase("target_2");
          await speakSegment(
            item[targetLang],
            targetLang,
            Math.min(1.1, speechRate + 0.05),
          );
          if (signal.aborted) break;
        }

        if (autoMarkLearned) {
          onMarkLearned(item.id);
        }

        await pacePause(850);
        if (signal.aborted) break;

        if (idx + 1 < playlist.length) {
          idx += 1;
        } else if (loopEnabled) {
          idx = 0;
        } else {
          stopPlayback("finished");
          break;
        }
      }
    };

    void runLoop();

    return () => {
      controller.abort();
      stopSharedMp3Playback();
      cancelSpeech();
    };
    // Intentionally restarts sequential loop on audio settings / track jump
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPlaying,
    style,
    preferStudioMp3,
    speechRate,
    thinkPauseMs,
    loopEnabled,
    autoMarkLearned,
    playlist,
    nativeLang,
    targetLang,
  ]);

  const jumpToIndex = useCallback(
    (nextIndex: number) => {
      if (playlist.length === 0) return;
      const clamped =
        ((nextIndex % playlist.length) + playlist.length) % playlist.length;
      setCurrentIndex(clamped);
      if (isPlaying) {
        abortRef.current?.abort();
        stopSharedMp3Playback();
        cancelSpeech();
        setIsPlaying(false);
        window.setTimeout(() => {
          unlockSpeechSynthesis();
          setIsPlaying(true);
        }, 40);
      } else {
        setPhase("idle");
      }
    },
    [isPlaying, playlist.length],
  );

  const handleTogglePlay = useCallback(() => {
    if (playlist.length === 0) return;
    unlockSpeechSynthesis();
    if (isPlaying) {
      stopPlayback("idle");
    } else {
      if (phase === "finished" && currentIndex >= playlist.length - 1) {
        setCurrentIndex(0);
      }
      if (sleepMinutes > 0 && !sleepEndsAt) {
        setSleepEndsAt(Date.now() + sleepMinutes * 60_000);
      }
      setIsPlaying(true);
    }
  }, [
    currentIndex,
    isPlaying,
    phase,
    playlist.length,
    sleepEndsAt,
    sleepMinutes,
    stopPlayback,
  ]);

  // Bind earbud hardware media buttons (Play/Pause/Next/Previous)
  useEffect(() => {
    return bindEarbudHardwareControls({
      onPlay: () => {
        if (!isPlaying && playlist.length > 0) {
          unlockSpeechSynthesis();
          setIsPlaying(true);
        }
      },
      onPause: () => {
        if (isPlaying) stopPlayback("idle");
      },
      onNext: () => jumpToIndex(safeIndex + 1),
      onPrevious: () => jumpToIndex(safeIndex - 1),
      onReplay: () => jumpToIndex(safeIndex),
    });
  }, [isPlaying, jumpToIndex, playlist.length, safeIndex, stopPlayback]);

  const handleSelectTargetLanguage = (nextTarget: LanguageCode) => {
    if (nextTarget === targetLang) return;
    stopPlayback("idle");
    let nextNative = nativeLang;
    if (nextNative === nextTarget) {
      nextNative = nextTarget === "fi" ? "en" : "fi";
    }
    onChangePreferences({
      ...progress.preferences,
      nativeLanguage: nextNative,
      targetLanguage: nextTarget,
    });
  };

  const handleSelectDeck = (deckId: string) => {
    stopPlayback("idle");
    setSelectedDeckId(deckId);
    setCurrentIndex(0);
  };

  const handlePrecacheCurrentPack = async () => {
    if (downloadingPack) {
      precacheAbortRef.current?.abort();
      setDownloadingPack(false);
      setDownloadProgress(null);
      return;
    }

    const controller = new AbortController();
    precacheAbortRef.current = controller;
    setDownloadingPack(true);

    const langs: LanguageCode[] =
      style === "immersion" ? [targetLang] : [nativeLang, targetLang];
    const itemsToCache = activeDeckMeta.items;

    const result = await precacheAudioPack({
      items: itemsToCache,
      languages: langs,
      signal: controller.signal,
      onProgress: (done, total) => setDownloadProgress({ done, total }),
    });

    if (!controller.signal.aborted) {
      setDownloadingPack(false);
      setDownloadProgress(null);
      refreshCacheStatus();
      setReviewNotice(
        result.failed === 0
          ? `${result.done} MP3-ääniraitaa tallennettu offline-käyttöön`
          : `Tallennettu ${result.done - result.failed}/${result.total} raitaa`,
      );
      window.setTimeout(() => setReviewNotice(null), 2600);
    }
  };

  const handleStartContinuousMarathon = useCallback(() => {
    unlockSpeechSynthesis();
    void BackgroundAudio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    setSelectedDeckId("all-course");
    setLoopEnabled(true);
    setCurrentIndex(0);
    setIsPlaying(true);
  }, []);

  const handleClearOfflineStorage = async () => {
    await clearAllOfflineAudio();
    refreshCacheStatus();
    setReviewNotice("Offline-äänivarasto (IndexedDB) tyhjennetty");
    window.setTimeout(() => setReviewNotice(null), 2400);
  };

  const handleSleepSelect = (mins: number) => {
    setSleepMinutes(mins);
    if (mins === 0) {
      setSleepEndsAt(null);
      setSleepRemainingMin(null);
    } else {
      setSleepEndsAt(Date.now() + mins * 60_000);
    }
  };

  const handleMarkHard = () => {
    if (!currentItem) return;
    const lessonId = findLessonIdForSentenceId(currentItem.id);
    onEnqueueReview(currentItem.id, lessonId);
    setReviewNotice("Lisätty kertausjonoon");
    window.setTimeout(() => setReviewNotice(null), 1800);
  };

  const handleMarkDone = () => {
    if (!currentItem) return;
    onMarkLearned(currentItem.id);
    setReviewNotice("Merkitty osatuksi");
    window.setTimeout(() => setReviewNotice(null), 1800);
  };

  const progressPct =
    playlist.length === 0
      ? 0
      : Math.round(((safeIndex + 1) / playlist.length) * 100);
  const activeHint = currentItem
    ? getPronunciationForTarget(currentItem, targetLang)
    : null;
  const isPackFullyCached =
    cacheStatus.total > 0 && cacheStatus.cached >= cacheStatus.total;
  const packDownloadHref = `/api/audio-pack?packId=${encodeURIComponent(activeDeckMeta.id)}&native=${nativeLang}&target=${targetLang}&style=${style}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-24 pt-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D6A4F]">
            <Headphones size={14} aria-hidden="true" />
            <span>
              {audioSchoolOnly
                ? `Pelkkä kuuntelukoulu · ${catalogTotalTracks * 3} ääniraitaa`
                : `MP3-äänipalvelu · ${catalogTotalTracks * 3} raitaa (es/fi/en)`}
            </span>
          </div>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#142620]">
            {audioSchoolOnly
              ? "Pelkkä kuuntelukoulu"
              : "Kuuntele taustalla kuulokkeilla"}
          </h1>
          <p className="mt-0.5 text-xs text-[#4A5D55]">
            {audioSchoolOnly
              ? "Vain äänikuuntelu aktiivinen — opiskele korvanapeilla ilman ruudun lukemista."
              : catalogSynced
                ? "Studio-MP3-äänet haetaan palvelimelta ja ne jatkuvat näytön sammuttua."
                : "Paikallinen ja välimuistitettu ääni käytössä."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {onShareListeningPath && (
            <button
              type="button"
              onClick={() => {
                void onShareListeningPath().then(({ copied }) => {
                  setReviewNotice(
                    copied
                      ? "Kuuntelupolun linkki kopioitu leikepöydälle"
                      : "Kuuntelupolun linkki luotu",
                  );
                  window.setTimeout(() => setReviewNotice(null), 2600);
                });
              }}
              aria-label="Jaa kuuntelupolku linkkinä"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D4DFD9] bg-white text-[#142620] transition-colors hover:bg-[#EFF5F1]"
            >
              <Share2 size={16} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setAudioSchoolOnly((prev) => {
                const next = !prev;
                setHideTranslation(next);
                return next;
              });
            }}
            aria-pressed={audioSchoolOnly}
            className={`flex min-h-[44px] items-center justify-center rounded-xl border px-3 text-xs font-semibold transition-colors ${
              audioSchoolOnly
                ? "border-[#1E3F35] bg-[#EAF2EE] text-[#1E3F35]"
                : "border-[#D4DFD9] bg-white text-[#142620]"
            }`}
          >
            {audioSchoolOnly ? "Näytä listat" : "Vain kuuntelukoulu"}
          </button>

          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            aria-label="Kuunteluasetukset"
            className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
              showSettings
                ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                : "border-[#D4DFD9] bg-white text-[#142620]"
            }`}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Asetukset</span>
          </button>
        </div>
      </header>

      {/* Opiskeltavan kielen pikavalitsin: Espanja, Englanti, Suomi */}
      <section aria-label="Opiskeltava kieli kuulokkeilla">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#DCE5DF] bg-white p-1.5">
          {TARGET_LANG_CHOICES.map((lang) => {
            const active = targetLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectTargetLanguage(lang.code)}
                aria-pressed={active}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
                  active
                    ? "bg-[#1E3F35] text-white"
                    : "text-[#4A5D55] hover:bg-[#EFF5F1] hover:text-[#142620]"
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 px-1 text-[11px] text-[#4A5D55]">
          Kielipari: {LANGUAGE_LABELS[nativeLang]} →{" "}
          {LANGUAGE_LABELS[targetLang]}
        </p>
      </section>

      {/* Omistettu pikanappi jatkuvaan äänikuunteluun */}
      <button
        type="button"
        onClick={() => {
          if (isPlaying && selectedDeckId === "all-course" && loopEnabled) {
            stopPlayback("idle");
          } else {
            handleStartContinuousMarathon();
          }
        }}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border border-[#2D6A4F] bg-[#EAF2EE] px-4 py-3 text-left transition-colors hover:bg-[#DFECE5]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E3F35] text-white">
            {isPlaying && selectedDeckId === "all-course" && loopEnabled ? (
              <Pause size={18} fill="currentColor" aria-hidden="true" />
            ) : (
              <Play size={18} fill="currentColor" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#142620]">
              {isPlaying && selectedDeckId === "all-course" && loopEnabled
                ? "Yhtäsoittoa-opiskelu käynnissä"
                : "Aloita yhtäsoittoa-kuuntelu"}
            </p>
            <p className="truncate text-xs text-[#385348]">
              Koko {ALL_SENTENCES.length} ilmauksen kurssi ({LANGUAGE_LABELS[targetLang]})
              jatkuvassa silmukassa
            </p>
          </div>
        </div>
        <Repeat size={18} className="shrink-0 text-[#1E3F35]" aria-hidden="true" />
      </button>

      {/* Pääsoitin */}
      <section className="rounded-3xl bg-[#1E3F35] p-5 text-white shadow-sm">
        <div className="flex items-center justify-between gap-2 text-xs text-[#B6D4C6]">
          <span className="truncate font-semibold">{activeDeckMeta.title}</span>
          <div className="flex shrink-0 items-center gap-2">
            {sleepRemainingMin !== null && (
              <span className="flex items-center gap-1 tabular-nums text-[#D7E8DF]">
                <Moon size={12} aria-hidden="true" />
                {sleepRemainingMin} min
              </span>
            )}
            <span className="font-bold tabular-nums text-white">
              {playlist.length === 0
                ? "0 / 0"
                : `${safeIndex + 1} / ${playlist.length}`}
            </span>
          </div>
        </div>

        {/* Edistymispalkki */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-[#74C69D] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Aktiivinen sana / lause */}
        {currentItem ? (
          <div className="mt-4 min-h-[124px] rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#95D5B2]">
                {PHASE_LABELS[phase]} ·{" "}
                {preferStudioMp3 && activeAudioEngine === "mp3"
                  ? "MP3"
                  : "Laiteääni"}
              </span>
              <button
                type="button"
                onClick={() => setHideTranslation((v) => !v)}
                aria-label={
                  hideTranslation
                    ? audioSchoolOnly
                      ? "Kurkista teksti"
                      : "Näytä käännös"
                    : audioSchoolOnly
                      ? "Piilota teksti"
                      : "Piilota käännös"
                }
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white/10 px-2.5 text-[11px] font-semibold text-white"
              >
                {hideTranslation ? (
                  <>
                    <Eye size={13} aria-hidden="true" />
                    <span>
                      {audioSchoolOnly ? "Kurkista teksti" : "Näytä käännös"}
                    </span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} aria-hidden="true" />
                    <span>
                      {audioSchoolOnly ? "Piilota teksti" : "Piilota käännös"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {audioSchoolOnly && hideTranslation ? (
              <div className="mt-4 flex flex-col items-center justify-center py-3 text-center">
                <Headphones
                  size={28}
                  className="text-[#95D5B2]"
                  aria-hidden="true"
                />
                <p className="mt-2 text-base font-bold text-white">
                  Vain äänikuuntelu päällä
                </p>
                <p className="mt-0.5 text-xs text-[#C5DDD1]">
                  Kuuntele {LANGUAGE_LABELS[targetLang]} korvanapeilla — voit halutessasi kurkistaa tekstin yläkulmasta.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-2.5 text-xl font-bold leading-snug tracking-tight text-white">
                  {currentItem[targetLang]}
                </p>
                {activeHint && (
                  <p className="mt-1 text-xs text-[#C5DDD1]">
                    Ääntäminen: {activeHint}
                  </p>
                )}
                {!hideTranslation && (
                  <p className="mt-2.5 border-t border-white/15 pt-2.5 text-sm font-medium text-[#E8F3ED]">
                    {currentItem[nativeLang]}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white/10 p-5 text-center text-sm text-[#D7E8DF]">
            Valitussa soittolistassa ei ole vielä ilmaisuja.
          </div>
        )}

        {/* Suuret korvanappien/bussin peukalopainikkeet */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={playlist.length === 0}
            onClick={() => jumpToIndex(safeIndex - 1)}
            aria-label="Edellinen ilmaus"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-40"
          >
            <SkipBack size={22} />
          </button>

          <button
            type="button"
            disabled={playlist.length === 0}
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "Tauko" : "Toista kuulokkeilla"}
            className="flex h-16 w-20 items-center justify-center rounded-2xl bg-white text-[#1E3F35] shadow-md transition-transform active:scale-95 disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            type="button"
            disabled={playlist.length === 0}
            onClick={() => jumpToIndex(safeIndex + 1)}
            aria-label="Seuraava ilmaus"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-40"
          >
            <SkipForward size={22} />
          </button>
        </div>

        {/* Nopeat oppimispainikkeet */}
        {currentItem && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                unlockSpeechSynthesis();
                if (isPlaying) {
                  jumpToIndex(safeIndex);
                } else {
                  void speakPhraseWithStudioAudio(
                    currentItem[targetLang],
                    targetLang,
                    { rate: speechRate, preferStudioMp3 },
                  );
                }
              }}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Toista nyt</span>
            </button>

            <button
              type="button"
              onClick={handleMarkHard}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors ${
                reviewSet.has(currentItem.id)
                  ? "bg-[#95D5B2] text-[#142620]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <BookmarkPlus size={14} aria-hidden="true" />
              <span>Vaikea</span>
            </button>

            <button
              type="button"
              onClick={handleMarkDone}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors ${
                learnedSet.has(currentItem.id)
                  ? "bg-[#52B788] text-[#142620]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Check size={14} aria-hidden="true" />
              <span>
                {learnedSet.has(currentItem.id) ? "Osattu" : "Merkitse"}
              </span>
            </button>
          </div>
        )}

        {/* Offline-lataus (IndexedDB) ja MP3-tiedosto */}
        <div className="mt-3 space-y-2 border-t border-white/15 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePrecacheCurrentPack()}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white hover:bg-white/25"
            >
              <CloudDownload size={15} aria-hidden="true" />
              <span>
                {downloadingPack && downloadProgress
                  ? `Tallennetaan ${downloadProgress.done}/${downloadProgress.total}...`
                  : isPackFullyCached
                    ? `Tallennettu IndexedDB:hen (${cacheStatus.total})`
                    : `Tallenna offlineen (${cacheStatus.cached}/${cacheStatus.total})`}
              </span>
            </button>

            {activeDeckMeta.isSingleLesson && (
              <a
                href={packDownloadHref}
                download={`elovio-${targetLang}-${activeDeckMeta.id}.mp3`}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#95D5B2] px-3.5 text-xs font-bold text-[#142620] hover:bg-[#74C69D]"
              >
                <Download size={15} aria-hidden="true" />
                <span>Lataa MP3</span>
              </a>
            )}
          </div>
          <p className="text-[11px] text-[#B6D4C6] tabular-nums">
            Laitteen offline-muisti (IndexedDB): {offlineStats.count} ääniraitaa ·{" "}
            {(offlineStats.totalBytes / (1024 * 1024)).toFixed(1)} Mt
          </p>
        </div>

        {reviewNotice && (
          <p
            role="status"
            className="mt-2.5 text-center text-xs font-semibold text-[#95D5B2]"
          >
            {reviewNotice}
          </p>
        )}
      </section>

      {/* Kuuntelutapa */}
      <section className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
        <h2 className="text-sm font-bold text-[#142620]">Kuuntelutapa</h2>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STYLE_OPTIONS.map((opt) => {
            const active = style === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStyle(opt.id)}
                aria-pressed={active}
                className={`min-h-[56px] rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-[#1E3F35] bg-[#EAF2EE]"
                    : "border-[#D4DFD9] bg-[#FAF9F6] hover:bg-[#F3F8F5]"
                }`}
              >
                <p className="text-xs font-bold text-[#142620]">{opt.title}</p>
                <p className="mt-0.5 text-[11px] text-[#4A5D55]">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tarkemmat asetukset (avautuva paneeli) */}
      {showSettings && (
        <section className="space-y-4 rounded-2xl border border-[#DCE5DF] bg-white p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#4A5D55]">
              Äänitiedoston lähde
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferStudioMp3(true)}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold ${
                  preferStudioMp3
                    ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                    : "border-[#D4DFD9] bg-white text-[#142620]"
                }`}
              >
                Studio-MP3 (suositus)
              </button>
              <button
                type="button"
                onClick={() => setPreferStudioMp3(false)}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold ${
                  !preferStudioMp3
                    ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                    : "border-[#D4DFD9] bg-white text-[#142620]"
                }`}
              >
                Laitteen oma ääni
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#4A5D55]">
              Puhenopeus
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { label: "0.75× Hidas", value: 0.75 },
                { label: "0.90× Selkeä", value: 0.9 },
                { label: "1.05× Normaali", value: 1.05 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSpeechRate(opt.value)}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold ${
                    speechRate === opt.value
                      ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                      : "border-[#D4DFD9] bg-white text-[#142620]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#4A5D55]">
              Miettimistauko välissä
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[
                { label: "0 s", value: 0 },
                { label: "1.5 s", value: 1500 },
                { label: "3 s", value: 3000 },
                { label: "5 s", value: 5000 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setThinkPauseMs(opt.value)}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold ${
                    thinkPauseMs === opt.value
                      ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                      : "border-[#D4DFD9] bg-white text-[#142620]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#4A5D55]">
              Uniajastin
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[
                { label: "Pois", value: 0 },
                { label: "10 min", value: 10 },
                { label: "20 min", value: 20 },
                { label: "30 min", value: 30 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSleepSelect(opt.value)}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold ${
                    sleepMinutes === opt.value
                      ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                      : "border-[#D4DFD9] bg-white text-[#142620]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setShuffleEnabled((v) => !v)}
              aria-pressed={shuffleEnabled}
              className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3 text-xs font-semibold ${
                shuffleEnabled
                  ? "border-[#1E3F35] bg-[#EAF2EE] text-[#1E3F35]"
                  : "border-[#D4DFD9] bg-white text-[#142620]"
              }`}
            >
              <span className="flex items-center gap-2">
                <Shuffle size={15} aria-hidden="true" />
                Sekoita järjestys
              </span>
              <span>{shuffleEnabled ? "Päällä" : "Pois"}</span>
            </button>

            <button
              type="button"
              onClick={() => setLoopEnabled((v) => !v)}
              aria-pressed={loopEnabled}
              className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3 text-xs font-semibold ${
                loopEnabled
                  ? "border-[#1E3F35] bg-[#EAF2EE] text-[#1E3F35]"
                  : "border-[#D4DFD9] bg-white text-[#142620]"
              }`}
            >
              <span className="flex items-center gap-2">
                <Repeat size={15} aria-hidden="true" />
                Jatkuva silmukka
              </span>
              <span>{loopEnabled ? "Päällä" : "Pois"}</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoMarkLearned((v) => !v)}
              aria-pressed={autoMarkLearned}
              className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3 text-xs font-semibold ${
                autoMarkLearned
                  ? "border-[#1E3F35] bg-[#EAF2EE] text-[#1E3F35]"
                  : "border-[#D4DFD9] bg-white text-[#142620]"
              }`}
            >
              <span className="flex items-center gap-2">
                <Check size={15} aria-hidden="true" />
                Merkitse kuunneltu opituksi
              </span>
              <span>{autoMarkLearned ? "Päällä" : "Pois"}</span>
            </button>

            {isWakeLockSupported() && (
              <button
                type="button"
                onClick={() => setKeepScreenAwake((v) => !v)}
                aria-pressed={keepScreenAwake}
                className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3 text-xs font-semibold ${
                  keepScreenAwake
                    ? "border-[#1E3F35] bg-[#EAF2EE] text-[#1E3F35]"
                    : "border-[#D4DFD9] bg-white text-[#142620]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Smartphone size={15} aria-hidden="true" />
                  Pidä näyttö päällä
                </span>
                <span>{keepScreenAwake ? "Päällä" : "Pois"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                unlockSpeechSynthesis();
                const sample = currentItem?.[targetLang] ?? "Hola, ¿cómo estás?";
                if (preferStudioMp3) {
                  void speakPhraseWithStudioAudio(sample, targetLang, {
                    rate: speechRate,
                    preferStudioMp3: true,
                  });
                } else {
                  speakText(sample, targetLang, { rate: speechRate });
                }
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#1E3F35] bg-[#FAF9F6] px-3 text-xs font-bold text-[#1E3F35] hover:bg-[#EAF2EE]"
            >
              <Volume2 size={16} aria-hidden="true" />
              <span>
                Testaa {preferStudioMp3 ? "Studio-MP3" : "laitteen"} ääni (
                {LANGUAGE_LABELS[targetLang]})
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleClearOfflineStorage()}
              disabled={offlineStats.count === 0}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#D4DFD9] bg-white px-3 text-xs font-semibold text-[#4A5D55] hover:bg-[#F5F9F6] disabled:opacity-45"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>
                Tyhjennä offline-äänet ({offlineStats.count})
              </span>
            </button>
          </div>
        </section>
      )}

      {!audioSchoolOnly && (
        <>
          {/* Pikakokoelmat pitkälle matkalle */}
          <section>
            <h2 className="text-sm font-bold text-[#142620]">
              Pikasoittolistat bussimatkalle
            </h2>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {deckDefinitions.quickCollections.map((col) => {
                const active = selectedDeckId === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleSelectDeck(col.id)}
                    className={`flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                      active
                        ? "border-[#1E3F35] bg-[#EAF2EE]"
                        : "border-[#DCE5DF] bg-white hover:bg-[#F5F9F6]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#2D6A4F]">
                        {col.badge} ·{" "}
                        <span className="tabular-nums">{col.items.length} kpl</span>
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-[#142620]">
                        {col.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#4A5D55]">
                        {col.subtitle}
                      </p>
                    </div>
                    <Headphones
                      size={18}
                      className="shrink-0 text-[#1E3F35]"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Aihekohtaiset paketit */}
          <section>
            <h2 className="text-sm font-bold text-[#142620]">
              Valitse yksittäinen paketti ({filteredPacks.length})
            </h2>

            <div
              role="tablist"
              aria-label="Kuuntelupakettien suodattimet"
              className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
            >
              {PLAYLIST_FILTERS.map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f)}
                    className={`min-h-[44px] shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                        : "border-[#D4DFD9] bg-white text-[#142620]"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredPacks.map((pack) => {
                const active = selectedDeckId === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => handleSelectDeck(pack.id)}
                    className={`flex min-h-[64px] items-center justify-between gap-2 rounded-2xl border p-3.5 text-left transition-colors ${
                      active
                        ? "border-[#1E3F35] bg-[#EAF2EE]"
                        : "border-[#DCE5DF] bg-white hover:bg-[#F5F9F6]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#4A5D55]">
                        {pack.category} ·{" "}
                        <span className="tabular-nums">
                          {pack.sentences.length}{" "}
                          {pack.kind === "word" ? "sanaa" : "lausetta"}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-[#142620]">
                        {pack.title}
                      </p>
                    </div>
                    <Play
                      size={16}
                      className={`shrink-0 ${active ? "text-[#1E3F35]" : "text-[#5C6F67]"}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Nykyisen soittolistan kappaleet */}
          {playlist.length > 0 && (
            <section className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
              <h2 className="text-sm font-bold text-[#142620]">
                Soittolistan sisältö ({playlist.length} kpl)
              </h2>
              <p className="mt-0.5 text-xs text-[#4A5D55]">
                Napauta mitä tahansa riviä hypätäksesi suoraan siihen.
              </p>
              <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {playlist.map((item, idx) => {
                  const active = idx === safeIndex;
                  const isLearned = learnedSet.has(item.id);
                  return (
                    <button
                      key={`${item.id}-${idx}`}
                      type="button"
                      onClick={() => jumpToIndex(idx)}
                      className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                        active
                          ? "bg-[#1E3F35] text-white"
                          : "bg-[#FAF9F6] text-[#142620] hover:bg-[#EFF5F1]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">
                          <span className="mr-1.5 tabular-nums opacity-70">
                            {idx + 1}.
                          </span>
                          {item[targetLang]}
                        </p>
                        <p
                          className={`truncate text-[11px] ${
                            active ? "text-[#D7E8DF]" : "text-[#4A5D55]"
                          }`}
                        >
                          {item[nativeLang]}
                        </p>
                      </div>
                      {isLearned && (
                        <Check
                          size={15}
                          aria-label="Osattu"
                          className={`shrink-0 ${
                            active ? "text-[#95D5B2]" : "text-[#2D6A4F]"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
