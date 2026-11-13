export type LanguageCode = "fi" | "es" | "en";

export type TabId = "home" | "listen" | "exercises" | "interpreter" | "tutor";

export type LearnerLevel = "Aloittaja" | "Perustaso" | "Keskitaso" | "Sujuva";

export type LessonCategory =
  | "Perussanasto"
  | "Arki"
  | "Ruoka & juoma"
  | "Matkustus"
  | "Terveys";

export type SentenceKind = "word" | "sentence";

export interface LessonSentence {
  id: string;
  fi: string;
  es: string;
  en: string;
  pronunciationHint: string;
  pronunciationHints?: Partial<Record<LanguageCode, string>>;
  kind?: SentenceKind;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  category: LessonCategory;
  difficulty: "Helppo" | "Keskitaso";
  estimatedMinutes: number;
  kind?: SentenceKind;
  sentences: LessonSentence[];
}

export type ListeningStyle = "active_recall" | "comprehension" | "immersion";

export interface ReviewQueueItem {
  sentenceId: string;
  lessonId: string;
  dueAt: string;
  intervalIndex: 0 | 1 | 2;
  wrongCount: number;
}

export interface UserPreferences {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  dailyGoalMinutes: number;
}

export interface UserProgressState {
  preferences: UserPreferences;
  learnedSentenceIds: string[];
  completedLessonIds: string[];
  studySecondsByDate: Record<string, number>;
  liveSecondsByDate: Record<string, number>;
  reviewQueue: ReviewQueueItem[];
}

export type MicPermissionState = "granted" | "denied" | "prompt" | "unknown";

export type MicErrorKind =
  | "NotAllowedError"
  | "NotFoundError"
  | "NotReadableError"
  | "UnsupportedError"
  | "UnknownError";

export type InterpreterStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "translating"
  | "playing"
  | "error";

export type SpeakerRole = "self" | "other";

export interface InterpreterTurn {
  id: string;
  speaker: SpeakerRole;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  sourceText: string;
  translatedText: string;
  timestamp: number;
  isLive?: boolean;
  isStreaming?: boolean;
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AccountUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
    provider?: string;
  };
}
