import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  HelpCircle,
  Volume2,
  X,
} from "lucide-react";
import { LANGUAGE_LABELS } from "@/data/lessons";
import {
  cancelSpeech,
  isFuzzyAnswerMatch,
  speakText,
  unlockSpeechSynthesis,
} from "@/services/speech";
import type { LanguageCode, Lesson, LessonSentence } from "@/types/elovio";

type QuestionMode = "choice" | "listen" | "type" | "match";

interface ChoiceQuestion {
  mode: "choice" | "listen";
  sentence: LessonSentence;
  promptText: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
}

interface TypeQuestion {
  mode: "type";
  sentence: LessonSentence;
  promptText: string;
  expectedAnswer: string;
}

interface MatchQuestion {
  mode: "match";
  sentence: LessonSentence;
  pairs: Array<{ id: string; nativeText: string; targetText: string }>;
}

type ExerciseQuestion = ChoiceQuestion | TypeQuestion | MatchQuestion;

interface ExercisePlayerScreenProps {
  lesson: Lesson;
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  isReviewMode?: boolean;
  onComplete: (result: {
    lessonId: string;
    correctSentenceIds: string[];
    wrongItems: Array<{ sentenceId: string; lessonId: string }>;
    durationSeconds: number;
    completedLesson: boolean;
  }) => void;
  onClose: () => void;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function buildQuestions(
  lesson: Lesson,
  nativeLang: LanguageCode,
  targetLang: LanguageCode,
): ExerciseQuestion[] {
  const pool = lesson.sentences;
  return pool.map((sentence, idx) => {
    const modeIndex = idx % 4;
    const mode: QuestionMode =
      modeIndex === 0
        ? "choice"
        : modeIndex === 1
          ? "listen"
          : modeIndex === 2
            ? "type"
            : pool.length >= 4
              ? "match"
              : "choice";

    if (mode === "type") {
      return {
        mode: "type",
        sentence,
        promptText: sentence[nativeLang],
        expectedAnswer: sentence[targetLang],
      };
    }

    if (mode === "match") {
      const others = shuffle(pool.filter((s) => s.id !== sentence.id)).slice(
        0,
        3,
      );
      const selected = [sentence, ...others];
      return {
        mode: "match",
        sentence,
        pairs: selected.map((s) => ({
          id: s.id,
          nativeText: s[nativeLang],
          targetText: s[targetLang],
        })),
      };
    }

    const distractors = shuffle(pool.filter((s) => s.id !== sentence.id)).slice(
      0,
      3,
    );
    const options = shuffle([sentence, ...distractors]).map((s) => ({
      id: s.id,
      label: mode === "listen" ? s[nativeLang] : s[targetLang],
    }));

    return {
      mode,
      sentence,
      promptText:
        mode === "listen"
          ? "Kuuntele ilmaus ja valitse oikea merkitys"
          : sentence[nativeLang],
      options,
      correctOptionId: sentence.id,
    };
  });
}

export function ExercisePlayerScreen({
  lesson,
  nativeLanguage,
  targetLanguage,
  isReviewMode = false,
  onComplete,
  onClose,
}: ExercisePlayerScreenProps) {
  const startTimeRef = useRef<number>(Date.now());
  const questions = useMemo(
    () => buildQuestions(lesson, nativeLanguage, targetLanguage),
    [lesson, nativeLanguage, targetLanguage],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    expected: string;
    hint: string;
  } | null>(null);
  const [typedInput, setTypedInput] = useState("");
  const [showHint, setShowHint] = useState(false);

  // Pair matching state
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchErrorPair, setMatchErrorPair] = useState<string | null>(null);

  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[stepIndex];

  const getPronunciationHint = (sentence: LessonSentence): string | null => {
    const specific = sentence.pronunciationHints?.[targetLanguage];
    if (specific) return specific;
    if (targetLanguage === "es" && sentence.pronunciationHint.trim()) {
      return sentence.pronunciationHint;
    }
    return null;
  };

  useEffect(() => {
    if (!currentQuestion || isFinished) return;
    if (currentQuestion.mode === "listen") {
      const timer = window.setTimeout(() => {
        speakText(currentQuestion.sentence[targetLanguage], targetLanguage);
      }, 180);
      return () => {
        window.clearTimeout(timer);
        cancelSpeech();
      };
    }
    return () => {
      cancelSpeech();
    };
  }, [currentQuestion, isFinished, targetLanguage]);

  const shuffledRightMatchOptions = useMemo(() => {
    if (!currentQuestion || currentQuestion.mode !== "match") return [];
    return shuffle(
      currentQuestion.pairs.map((p) => ({
        id: p.id,
        targetText: p.targetText,
      })),
    );
  }, [currentQuestion]);

  const recordOutcome = (sentenceId: string, isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectIds((prev) =>
        prev.includes(sentenceId) ? prev : [...prev, sentenceId],
      );
    } else {
      setWrongIds((prev) =>
        prev.includes(sentenceId) ? prev : [...prev, sentenceId],
      );
    }
  };

  const handleChoiceSelect = (optionId: string) => {
    if (
      !currentQuestion ||
      (currentQuestion.mode !== "choice" && currentQuestion.mode !== "listen") ||
      feedback
    ) {
      return;
    }
    const isCorrect = optionId === currentQuestion.correctOptionId;
    recordOutcome(currentQuestion.sentence.id, isCorrect);
    setFeedback({
      isCorrect,
      expected: currentQuestion.sentence[targetLanguage],
      hint: getPronunciationHint(currentQuestion.sentence) ?? "",
    });
    unlockSpeechSynthesis();
    speakText(currentQuestion.sentence[targetLanguage], targetLanguage);
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || currentQuestion.mode !== "type" || feedback) return;
    const isCorrect = isFuzzyAnswerMatch(
      typedInput,
      currentQuestion.expectedAnswer,
    );
    recordOutcome(currentQuestion.sentence.id, isCorrect);
    setFeedback({
      isCorrect,
      expected: currentQuestion.expectedAnswer,
      hint: getPronunciationHint(currentQuestion.sentence) ?? "",
    });
    unlockSpeechSynthesis();
    speakText(currentQuestion.expectedAnswer, targetLanguage);
  };

  const handleMatchRightTap = (rightId: string) => {
    if (
      !currentQuestion ||
      currentQuestion.mode !== "match" ||
      !selectedLeftId ||
      feedback
    ) {
      return;
    }
    if (selectedLeftId === rightId) {
      const nextMatched = [...matchedIds, rightId];
      setMatchedIds(nextMatched);
      setSelectedLeftId(null);
      setMatchErrorPair(null);

      const pair = currentQuestion.pairs.find((p) => p.id === rightId);
      if (pair) {
        unlockSpeechSynthesis();
        speakText(pair.targetText, targetLanguage);
      }

      if (nextMatched.length === currentQuestion.pairs.length) {
        recordOutcome(currentQuestion.sentence.id, true);
        setFeedback({
          isCorrect: true,
          expected: currentQuestion.sentence[targetLanguage],
          hint: getPronunciationHint(currentQuestion.sentence) ?? "",
        });
      }
    } else {
      setMatchErrorPair(rightId);
      recordOutcome(currentQuestion.sentence.id, false);
      window.setTimeout(() => setMatchErrorPair(null), 500);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setTypedInput("");
    setShowHint(false);
    setSelectedLeftId(null);
    setMatchedIds([]);
    setMatchErrorPair(null);

    if (stepIndex + 1 < questions.length) {
      setStepIndex((prev) => prev + 1);
    } else {
      const durationSeconds = Math.max(
        30,
        Math.round((Date.now() - startTimeRef.current) / 1000),
      );
      setIsFinished(true);
      onComplete({
        lessonId: lesson.id,
        correctSentenceIds: correctIds.filter((id) => !wrongIds.includes(id)),
        wrongItems: wrongIds.map((sentenceId) => ({
          sentenceId,
          lessonId: lesson.id,
        })),
        durationSeconds,
        completedLesson: !isReviewMode,
      });
    }
  };

  if (isFinished) {
    const cleanCorrect = correctIds.filter((id) => !wrongIds.includes(id)).length;
    const total = Math.max(1, questions.length);
    const accuracy = Math.round((cleanCorrect / total) * 100);

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF9F6] text-[#142620]">
        <header className="flex h-14 items-center justify-between border-b border-[#DDE5E0] bg-white px-4">
          <h1 className="text-base font-bold">Harjoitus valmis</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sulje yhteenveto"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#4A5D55] hover:bg-[#EFF5F1]"
          >
            <X size={20} />
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 px-4 py-6">
          <div className="rounded-3xl border border-[#DCE5DF] bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF2EE] text-[#1E3F35]">
              <Check size={28} />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-[#142620]">
              Hienosti tehty!
            </h2>
            <p className="mt-1 text-sm text-[#4A5D55]">{lesson.title}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-[#F4F8F5] p-3.5">
                <p className="text-xs text-[#4A5D55]">Oikein heti</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-[#1E3F35]">
                  {cleanCorrect} / {total} ({accuracy}%)
                </p>
              </div>
              <div className="rounded-2xl bg-[#F4F8F5] p-3.5">
                <p className="text-xs text-[#4A5D55]">Kertausjonoon</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-[#142620]">
                  {wrongIds.length} kpl
                </p>
              </div>
            </div>

            {wrongIds.length > 0 && (
              <p className="mt-4 text-xs text-[#4A5D55]">
                Väärin menneet ilmaisut on lisätty kertausjonoon (1, 3 ja 7
                päivän rytmillä).
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] w-full rounded-2xl bg-[#1E3F35] text-base font-bold text-white shadow-sm hover:bg-[#17322A]"
          >
            Palaa harjoituksiin
          </button>
        </main>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progressPct = Math.round(((stepIndex + 1) / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF9F6] text-[#142620]">
      {/* Yläpalkki */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#DDE5E0] bg-white px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Keskeytä harjoitus"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#4A5D55] hover:bg-[#EFF5F1]"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Harjoituksen eteneminen"
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E8F0EC]"
        >
          <div
            className="h-full rounded-full bg-[#2D6A4F] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <span className="min-w-[48px] text-right text-sm font-bold tabular-nums text-[#1E3F35]">
          {stepIndex + 1}/{questions.length}
        </span>
      </header>

      {/* Tehtäväsisältö */}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-between overflow-y-auto px-4 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5D55]">
            {currentQuestion.mode === "choice" && "Valitse oikea käännös"}
            {currentQuestion.mode === "listen" && "Kuuntele ja valitse"}
            {currentQuestion.mode === "type" &&
              `Kirjoita kielellä ${LANGUAGE_LABELS[targetLanguage]}`}
            {currentQuestion.mode === "match" && "Yhdistä parit napauttamalla"}
          </p>

          {/* Kysymysotsikko tai kuuntelunappi */}
          {currentQuestion.mode === "listen" ? (
            <div className="mt-4 flex flex-col items-center rounded-3xl border border-[#DCE5DF] bg-white p-6 text-center">
              <button
                type="button"
                onClick={() => {
                  unlockSpeechSynthesis();
                  speakText(
                    currentQuestion.sentence[targetLanguage],
                    targetLanguage,
                  );
                }}
                aria-label="Kuuntele ilmaus"
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E3F35] text-white shadow-sm transition-transform active:scale-95"
              >
                <Volume2 size={28} />
              </button>
              <p className="mt-3 text-sm font-medium text-[#4A5D55]">
                Napauta kuullaksesi ilmauksen uudelleen
              </p>
            </div>
          ) : currentQuestion.mode !== "match" ? (
            <div className="mt-3 rounded-2xl border border-[#DCE5DF] bg-white p-4">
              <p className="text-lg font-bold text-[#142620]">
                {currentQuestion.promptText}
              </p>
            </div>
          ) : null}

          {/* Monivalinta / Kuuntele */}
          {(currentQuestion.mode === "choice" ||
            currentQuestion.mode === "listen") && (
            <div className="mt-4 space-y-2.5">
              {currentQuestion.options.map((opt) => {
                const isSelectedCorrect =
                  feedback && opt.id === currentQuestion.correctOptionId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => handleChoiceSelect(opt.id)}
                    className={`flex min-h-[52px] w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-base font-medium transition-colors ${
                      isSelectedCorrect
                        ? "border-[#2D6A4F] bg-[#EAF2EE] text-[#142620]"
                        : "border-[#D4DFD9] bg-white text-[#142620] hover:bg-[#F3F8F5]"
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Kirjoitustehtävä */}
          {currentQuestion.mode === "type" && (() => {
            const activeHint = getPronunciationHint(currentQuestion.sentence);
            return (
              <form onSubmit={handleTypeSubmit} className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {activeHint ? (
                    <button
                      type="button"
                      onClick={() => setShowHint((v) => !v)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#1E3F35]"
                    >
                      <HelpCircle size={15} aria-hidden="true" />
                      <span>
                        {showHint ? "Piilota ääntämisvinkki" : "Näytä ääntämisvinkki"}
                      </span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      unlockSpeechSynthesis();
                      speakText(
                        currentQuestion.expectedAnswer,
                        targetLanguage,
                      );
                    }}
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#1E3F35]"
                  >
                    <Volume2 size={15} aria-hidden="true" />
                    <span>Kuuntele</span>
                  </button>
                </div>

                {showHint && activeHint && (
                  <p className="rounded-xl bg-[#EAF2EE] px-3 py-2 text-xs text-[#1E3F35]">
                    Ääntämisvinkki: {activeHint}
                  </p>
                )}

              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                disabled={Boolean(feedback)}
                placeholder={`Kirjoita (${LANGUAGE_LABELS[targetLanguage]})...`}
                aria-label="Käännös"
                className="min-h-[48px] w-full rounded-2xl border border-[#C6D5CC] bg-white px-4 text-base text-[#142620] outline-none focus:border-[#1E3F35]"
              />

              {!feedback && (
                <button
                  type="submit"
                  disabled={!typedInput.trim()}
                  className="min-h-[48px] w-full rounded-2xl bg-[#1E3F35] text-base font-bold text-white disabled:opacity-40"
                >
                  Tarkista
                </button>
              )}
              </form>
            );
          })()}

          {/* Parien yhdistäminen */}
          {currentQuestion.mode === "match" && (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="space-y-2">
                {currentQuestion.pairs.map((p) => {
                  const done = matchedIds.includes(p.id);
                  const selected = selectedLeftId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={done}
                      onClick={() => setSelectedLeftId(p.id)}
                      className={`min-h-[56px] w-full rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                        done
                          ? "border-[#B8D4C5] bg-[#EAF2EE] text-[#3E5E50]"
                          : selected
                            ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                            : "border-[#D4DFD9] bg-white text-[#142620]"
                      }`}
                    >
                      {p.nativeText}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                {shuffledRightMatchOptions.map((opt) => {
                  const done = matchedIds.includes(opt.id);
                  const wrong = matchErrorPair === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={done || !selectedLeftId}
                      onClick={() => handleMatchRightTap(opt.id)}
                      className={`min-h-[56px] w-full rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                        done
                          ? "border-[#B8D4C5] bg-[#EAF2EE] text-[#3E5E50]"
                          : wrong
                            ? "border-[#B83B35] bg-[#FDECEA] text-[#8C2D28]"
                            : "border-[#D4DFD9] bg-white text-[#142620] hover:bg-[#F3F8F5]"
                      }`}
                    >
                      {opt.targetText}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Välitön palaute ja Seuraava */}
        {feedback && (
          <div
            role="status"
            className={`mt-5 rounded-2xl border p-4 ${
              feedback.isCorrect
                ? "border-[#2D6A4F] bg-[#EAF2EE]"
                : "border-[#D68A86] bg-[#FDF3F2]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-sm font-bold ${
                    feedback.isCorrect ? "text-[#1E3F35]" : "text-[#8C2D28]"
                  }`}
                >
                  {feedback.isCorrect ? "Oikein!" : "Melkein! Oikea muoto:"}
                </p>
                <p className="mt-1 text-base font-bold text-[#142620]">
                  {feedback.expected}
                </p>
                {feedback.hint && (
                  <p className="mt-0.5 text-xs text-[#4A5D55]">
                    Ääntäminen: {feedback.hint}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  unlockSpeechSynthesis();
                  speakText(feedback.expected, targetLanguage);
                }}
                aria-label="Kuuntele oikea vastaus"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-white text-[#1E3F35]"
              >
                <Volume2 size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="mt-4 min-h-[48px] w-full rounded-xl bg-[#1E3F35] text-sm font-bold text-white hover:bg-[#17322A]"
            >
              {stepIndex + 1 < questions.length ? "Seuraava" : "Näytä tulos"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
