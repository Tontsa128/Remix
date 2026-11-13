import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  AlertCircle,
} from "lucide-react";
import { LANGUAGE_LABELS, QUICK_PHRASES } from "@/data/lessons";
import { DualLiveTranslator } from "@/services/live-translator";
import {
  checkMicPermission,
  requestMicStream,
  stopMicStream,
} from "@/services/mic";
import {
  cancelSpeech,
  speakText,
  startSpeechDictation,
  unlockSpeechSynthesis,
} from "@/services/speech";
import { translatePhrase } from "@/services/translate";
import type {
  InterpreterStatus,
  InterpreterTurn,
  LanguageCode,
  MicPermissionState,
  SpeakerRole,
} from "@/types/elovio";

interface InterpreterScreenProps {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  remainingLiveSeconds: number;
  onConsumeLiveSeconds: (seconds: number) => void;
}

const STATUS_LABELS: Record<InterpreterStatus, string> = {
  idle: "Valmis",
  connecting: "Yhdistää...",
  listening: "Kuuntelee...",
  translating: "Kääntää...",
  playing: "Toistaa...",
  error: "Virhe",
};

export function InterpreterScreen({
  nativeLanguage,
  targetLanguage,
  remainingLiveSeconds,
  onConsumeLiveSeconds,
}: InterpreterScreenProps) {
  const [mode, setMode] = useState<"text" | "live">("text");
  const [swapped, setSwapped] = useState(false);
  const [speaker, setSpeaker] = useState<SpeakerRole>("self");
  const [inputText, setInputText] = useState("");
  const [turns, setTurns] = useState<InterpreterTurn[]>([]);
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micPermission, setMicPermission] =
    useState<MicPermissionState>("unknown");
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const liveTranslatorRef = useRef<DualLiveTranslator | null>(null);
  const dictationRef = useRef<{ stop: () => void } | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const leftLang = swapped ? targetLanguage : nativeLanguage;
  const rightLang = swapped ? nativeLanguage : targetLanguage;

  const activeSourceLang = speaker === "self" ? leftLang : rightLang;
  const activeTargetLang = speaker === "self" ? rightLang : leftLang;

  const stopDictation = useCallback(() => {
    dictationRef.current?.stop();
    dictationRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopLiveSession = useCallback(async () => {
    setIsLiveActive(false);
    await liveTranslatorRef.current?.stop();
    liveTranslatorRef.current = null;
    setAudioLevel(0);
    setStatus("idle");
  }, []);

  useEffect(() => {
    void checkMicPermission().then(setMicPermission);
    return () => {
      dictationRef.current?.stop();
      cancelSpeech();
      void liveTranslatorRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]);

  useEffect(() => {
    if (!isLiveActive) return;
    const timer = window.setInterval(() => {
      onConsumeLiveSeconds(1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLiveActive, onConsumeLiveSeconds]);

  useEffect(() => {
    if (isLiveActive && remainingLiveSeconds <= 0) {
      void stopLiveSession();
      setErrorMessage(
        "Päivittäinen Live-tulkin aikaraja tuli täyteen. Voit jatkaa tekstikäännöksellä.",
      );
    }
  }, [isLiveActive, remainingLiveSeconds, stopLiveSession]);

  const handleModeSwitch = async (nextMode: "text" | "live") => {
    if (nextMode === mode) return;
    stopDictation();
    if (isLiveActive) {
      await stopLiveSession();
    }
    setErrorMessage(null);
    setStatus("idle");
    setMode(nextMode);
  };

  const handleTranslateAndSpeak = async (
    rawText: string,
    overrideSpeaker?: SpeakerRole,
  ) => {
    const clean = rawText.trim();
    if (!clean) return;
    const turnSpeaker = overrideSpeaker ?? speaker;
    const src = turnSpeaker === "self" ? leftLang : rightLang;
    const dst = turnSpeaker === "self" ? rightLang : leftLang;

    setErrorMessage(null);
    setStatus("translating");
    unlockSpeechSynthesis();

    try {
      const { translatedText } = await translatePhrase({
        text: clean,
        from: src,
        to: dst,
      });

      const turn: InterpreterTurn = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        speaker: turnSpeaker,
        sourceLang: src,
        targetLang: dst,
        sourceText: clean,
        translatedText,
        timestamp: Date.now(),
      };
      setTurns((prev) => [...prev, turn]);
      setStatus("playing");
      speakText(translatedText, dst, {
        onEnd: () => setStatus("idle"),
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Käännös epäonnistui. Yritä uudelleen.",
      );
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toSend = inputText.trim();
    if (!toSend) return;
    setInputText("");
    await handleTranslateAndSpeak(toSend);
  };

  const handleMicButtonTap = async () => {
    setErrorMessage(null);
    unlockSpeechSynthesis();

    if (mode === "live") {
      if (isLiveActive) {
        await stopLiveSession();
        return;
      }

      if (remainingLiveSeconds <= 0) {
        setErrorMessage(
          "Päivittäinen Live-tulkin aikaraja on käytetty. Käytä teksti- ja puhekäännöstä alla.",
        );
        return;
      }

      // Unlock Web Audio synchronously in the tap handler, before permission
      // prompts and token/network requests can consume the browser activation.
      const AudioCtx = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setStatus("error");
        setErrorMessage("Tämä selain ei tue live-tulkin äänenkäsittelyä. Kokeile Chromea.");
        return;
      }
      const unlockedInputContext = new AudioCtx();
      try {
        await unlockedInputContext.resume();
      } catch {
        await unlockedInputContext.close().catch(() => undefined);
        setStatus("error");
        setErrorMessage("Äänen käynnistys estyi. Napauta live-käännöksen aloitusta uudelleen ja salli ääni selaimessa.");
        return;
      }

      const micResult = await requestMicStream();
      const perm = await checkMicPermission();
      setMicPermission(perm);

      if (!micResult.ok || !micResult.stream) {
        await unlockedInputContext.close().catch(() => undefined);
        setStatus("error");
        setErrorMessage(
          micResult.errorMessage ?? "Mikrofonia ei voitu käynnistää.",
        );
        return;
      }

      const translator = new DualLiveTranslator({
        nativeLang: leftLang,
        otherLang: rightLang,
        callbacks: {
          onStatus: (nextStatus) => setStatus(nextStatus),
          onLevel: (lvl) => setAudioLevel(lvl),
          onError: (msg) => {
            setIsLiveActive(false);
            setErrorMessage(msg);
          },
          onTranscriptUpdate: ({
            speaker: sRole,
            sourceLang,
            targetLang,
            inputDelta,
            outputDelta,
            turnComplete,
          }) => {
            setTurns((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.isLive && last.isStreaming && last.speaker === sRole) {
                const updated: InterpreterTurn = {
                  ...last,
                  sourceText: inputDelta
                    ? `${last.sourceText} ${inputDelta}`.trim()
                    : last.sourceText,
                  translatedText: outputDelta
                    ? `${last.translatedText} ${outputDelta}`.trim()
                    : last.translatedText,
                  isStreaming: !turnComplete,
                };
                return [...prev.slice(0, -1), updated];
              }
              if (!inputDelta && !outputDelta) return prev;
              return [
                ...prev,
                {
                  id: `live-${Date.now()}`,
                  speaker: sRole,
                  sourceLang,
                  targetLang,
                  sourceText: (inputDelta ?? "").trim(),
                  translatedText: (outputDelta ?? "").trim(),
                  timestamp: Date.now(),
                  isLive: true,
                  isStreaming: !turnComplete,
                },
              ];
            });
          },
        },
      });

      translator.setSpeaker(speaker);
      liveTranslatorRef.current = translator;
      setIsLiveActive(true);
      await translator.start(micResult.stream, unlockedInputContext);
      return;
    }

    // Mode === "text": single press toggles dictation
    if (status === "listening") {
      stopDictation();
      setStatus("idle");
      return;
    }

    const micResult = await requestMicStream();
    const perm = await checkMicPermission();
    setMicPermission(perm);

    if (!micResult.ok || !micResult.stream) {
      setStatus("error");
      setErrorMessage(
        micResult.errorMessage ?? "Mikrofonin käynnistys epäonnistui.",
      );
      return;
    }

    // Release probe stream immediately so Web Speech Recognition can claim hardware mic on mobile
    stopMicStream(micResult.stream);
    setStatus("listening");

    dictationRef.current = startSpeechDictation({
      lang: activeSourceLang,
      onInterim: (interim) => {
        setInputText(interim);
      },
      onFinal: (finalText) => {
        setInputText("");
        void handleTranslateAndSpeak(finalText);
      },
      onError: (msg) => {
        setStatus("error");
        setErrorMessage(msg);
      },
      onEnd: () => {
        setAudioLevel(0);
        setStatus((curr) => (curr === "listening" ? "idle" : curr));
      },
    });
  };

  const handleSpeakerChange = (nextSpeaker: SpeakerRole) => {
    setSpeaker(nextSpeaker);
    liveTranslatorRef.current?.setSpeaker(nextSpeaker);
  };

  const quickPhrases = QUICK_PHRASES[activeSourceLang];
  const remainingMinutes = Math.ceil(remainingLiveSeconds / 60);

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-3xl flex-col px-4 pt-3">
      {/* Yläosa: kielipari, tilavalinta ja puhuja */}
      <div className="shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#DCE5DF] bg-white px-3 py-2">
          <span className="min-w-0 truncate text-sm font-bold text-[#142620]">
            {LANGUAGE_LABELS[leftLang]}
          </span>
          <button
            type="button"
            disabled={isLiveActive}
            onClick={() => setSwapped((v) => !v)}
            aria-label="Vaihda kielisuunta"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-[#EFF5F1] text-[#1E3F35] disabled:opacity-40"
          >
            <ArrowLeftRight size={18} />
          </button>
          <span className="min-w-0 truncate text-right text-sm font-bold text-[#142620]">
            {LANGUAGE_LABELS[rightLang]}
          </span>
        </div>

        {/* Tilavalinta ja puhujavalinta yhdessä kompaktissa rivissä */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid grid-cols-2 rounded-xl border border-[#DCE5DF] bg-white p-1">
            <button
              type="button"
              onClick={() => void handleModeSwitch("text")}
              className={`min-h-[44px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                mode === "text"
                  ? "bg-[#1E3F35] text-white"
                  : "text-[#4A5D55]"
              }`}
            >
              Teksti & Puhe
            </button>
            <button
              type="button"
              onClick={() => void handleModeSwitch("live")}
              className={`min-h-[44px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                mode === "live"
                  ? "bg-[#1E3F35] text-white"
                  : "text-[#4A5D55]"
              }`}
            >
              Live-ääni
            </button>
          </div>

          <div className="grid grid-cols-2 rounded-xl border border-[#DCE5DF] bg-white p-1">
            <button
              type="button"
              onClick={() => handleSpeakerChange("self")}
              className={`min-h-[44px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                speaker === "self"
                  ? "bg-[#2D6A4F] text-white"
                  : "text-[#4A5D55]"
              }`}
            >
              Minä puhun
            </button>
            <button
              type="button"
              onClick={() => handleSpeakerChange("other")}
              className={`min-h-[44px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                speaker === "other"
                  ? "bg-[#2D6A4F] text-white"
                  : "text-[#4A5D55]"
              }`}
            >
              Toinen puhuu
            </button>
          </div>
        </div>
      </div>

      {/* Tilapalkki + virhe- tai mikki-ilmoitukset */}
      <div className="mt-2 shrink-0 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#4A5D55]">
          <span className="font-semibold text-[#1E3F35]">
            Tila: {STATUS_LABELS[status]}
          </span>
          {mode === "live" ? (
            <span className="tabular-nums">
              Live-aikaa jäljellä tänään: {remainingMinutes} min
            </span>
          ) : (
            <span>
              Käännös: {LANGUAGE_LABELS[activeSourceLang]} →{" "}
              {LANGUAGE_LABELS[activeTargetLang]}
            </span>
          )}
        </div>

        {micPermission === "denied" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-[#E5C5C3] bg-[#FDF3F2] p-3 text-xs text-[#8C2D28]"
          >
            <MicOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Mikrofoni on estetty selaimessa. Salli mikrofoni selaimen
              sivustoasetuksista (osoitepalkin lukko- tai asetukset-kuvake) ja
              päivitä sivu.
            </p>
          </div>
        )}

        {errorMessage && micPermission !== "denied" && (
          <div
            role="alert"
            className="flex items-start justify-between gap-2 rounded-2xl border border-[#E5C5C3] bg-[#FDF3F2] p-3 text-xs text-[#8C2D28]"
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <p>{errorMessage}</p>
            </div>
            {mode === "live" && (
              <button
                type="button"
                onClick={() => void handleModeSwitch("text")}
                className="min-h-[36px] shrink-0 rounded-lg bg-[#8C2D28] px-2.5 text-xs font-semibold text-white"
              >
                Tekstitilaan
              </button>
            )}
          </div>
        )}

        {mode === "live" && !isLiveActive && !errorMessage && (
          <p className="rounded-xl bg-[#EAF2EE] px-3 py-2 text-xs text-[#1E3F35]">
            Puhe välitetään Googlen reaaliaikaiseen käännöspalveluun.
            Keskusteluja ei tallenneta.
          </p>
        )}
      </div>

      {/* Keskustelukuplat */}
      <div className="my-2 flex-1 space-y-2.5 overflow-y-auto rounded-2xl border border-[#DCE5DF] bg-white p-3">
        {turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-semibold text-[#142620]">
              {mode === "live"
                ? "Paina Aloita live-tulkkaus puhuaksesi"
                : "Valitse pikailmaus, kirjoita tai paina mikrofonia"}
            </p>
            <p className="mt-1 text-xs text-[#4A5D55]">
              Omat puheenvuorot näkyvät vasemmalla ja keskustelukumppanin
              oikealla.
            </p>
          </div>
        ) : (
          turns.map((turn) => {
            const isOwn = turn.speaker === "self";
            return (
              <div
                key={turn.id}
                className={`flex ${isOwn ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    isOwn
                      ? "bg-[#EAF2EE] text-[#142620]"
                      : "bg-[#1E3F35] text-white"
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium ${
                      isOwn ? "text-[#4A5D55]" : "text-[#C5DDD1]"
                    }`}
                  >
                    {LANGUAGE_LABELS[turn.sourceLang]}:{" "}
                    {turn.sourceText || "..."}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold leading-snug">
                      {turn.translatedText ||
                        (turn.isStreaming ? "Käännetään..." : "")}
                    </p>
                    {turn.translatedText && (
                      <button
                        type="button"
                        onClick={() => {
                          unlockSpeechSynthesis();
                          speakText(turn.translatedText, turn.targetLang);
                        }}
                        aria-label="Kuuntele käännös"
                        className={`flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg ${
                          isOwn
                            ? "bg-white text-[#1E3F35]"
                            : "bg-white/15 text-white"
                        }`}
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Alaosa: pikailmaukset + äänitaso + syöttö / mikrofoni */}
      <div className="shrink-0 space-y-2 pb-2">
        {mode === "text" && (
          <>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {quickPhrases.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => void handleTranslateAndSpeak(phrase)}
                  className="min-h-[44px] shrink-0 rounded-full border border-[#D4DFD9] bg-white px-3.5 text-xs font-medium text-[#142620] hover:bg-[#EFF5F1]"
                >
                  {phrase}
                </button>
              ))}
            </div>

            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Kirjoita (${LANGUAGE_LABELS[activeSourceLang]})...`}
                aria-label="Käännettävä teksti"
                className="min-h-[48px] min-w-0 flex-1 rounded-2xl border border-[#C6D5CC] bg-white px-3.5 text-sm text-[#142620] outline-none focus:border-[#1E3F35]"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || status === "translating"}
                aria-label="Käännä teksti"
                className="flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-2xl bg-[#2D6A4F] text-white disabled:opacity-40"
              >
                <Send size={18} />
              </button>
              {micPermission !== "denied" && (
                <button
                  type="button"
                  onClick={() => void handleMicButtonTap()}
                  aria-label={
                    status === "listening" ? "Lopeta sanelu" : "Aloita sanelu"
                  }
                  className={`flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-2xl text-white transition-colors ${
                    status === "listening" ? "bg-[#8C2D28]" : "bg-[#1E3F35]"
                  }`}
                >
                  {status === "listening" ? (
                    <Square size={18} />
                  ) : (
                    <Mic size={20} />
                  )}
                </button>
              )}
            </form>
          </>
        )}

        {mode === "live" && (
          <div className="space-y-2">
            {isLiveActive && (
              <div
                aria-label="Mikrofonin äänitaso"
                className="h-2 w-full overflow-hidden rounded-full bg-[#E2EAE5]"
              >
                <div
                  className="h-full rounded-full bg-[#2D6A4F] transition-all duration-100"
                  style={{ width: `${Math.max(4, audioLevel)}%` }}
                />
              </div>
            )}

            {micPermission !== "denied" && (
              <button
                type="button"
                onClick={() => void handleMicButtonTap()}
                className={`flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl text-base font-bold text-white shadow-sm transition-colors ${
                  isLiveActive
                    ? "bg-[#8C2D28] hover:bg-[#72231F]"
                    : "bg-[#1E3F35] hover:bg-[#17322A]"
                }`}
              >
                {isLiveActive ? (
                  <>
                    <Square size={18} />
                    <span>Lopeta</span>
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    <span>Aloita live-tulkkaus</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
