import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import {
  LANGUAGE_LABELS,
  ROLEPLAY_SCENARIOS,
  TUTOR_STARTERS,
  type RoleplayId,
} from "@/data/lessons";
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
import { explainTextOrImage, sendTutorChat } from "@/services/tutor";
import type {
  LanguageCode,
  LearnerLevel,
  MicPermissionState,
  TutorMessage,
} from "@/types/elovio";

interface TutorScreenProps {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  level: LearnerLevel;
}

export function TutorScreen({
  nativeLanguage,
  targetLanguage,
  level,
}: TutorScreenProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "explain">("chat");
  const [roleplay, setRoleplay] = useState<RoleplayId>("free");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] =
    useState<MicPermissionState>("unknown");

  // Selitä (Kieliapuri) state
  const [explainInput, setExplainInput] = useState("");
  const [explainImage, setExplainImage] = useState<{
    dataUrl: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    name: string;
  } | null>(null);
  const [explainResult, setExplainResult] = useState<string | null>(null);
  const [explainBusy, setExplainBusy] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const dictationRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void checkMicPermission().then(setMicPermission);
    return () => {
      dictationRef.current?.stop();
      cancelSpeech();
    };
  }, []);

  const extractTargetSpeech = (text: string): string => {
    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(vinkki|korjaus|huomio|käännös)\s*:/i.test(line));
    return (lines.join(". ").trim() || text).trim();
  };

  const handleSendChat = async (textOverride?: string) => {
    const content = (textOverride ?? chatInput).trim();
    if (!content || chatBusy) return;

    setChatError(null);
    if (!textOverride) setChatInput("");

    const userMsg: TutorMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setChatBusy(true);

    try {
      const reply = await sendTutorChat({
        nativeLanguage,
        targetLanguage,
        level,
        roleplay,
        messages: nextHistory,
      });

      const assistantMsg: TutorMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : "Opettajaan ei saatu yhteyttä.",
      );
    } finally {
      setChatBusy(false);
    }
  };

  const handleMicTap = async () => {
    setChatError(null);
    if (isListening) {
      dictationRef.current?.stop();
      dictationRef.current = null;
      setIsListening(false);
      return;
    }

    const res = await requestMicStream();
    const perm = await checkMicPermission();
    setMicPermission(perm);

    if (!res.ok || !res.stream) {
      setChatError(res.errorMessage ?? "Mikrofonin käynnistys epäonnistui.");
      return;
    }

    stopMicStream(res.stream);
    setIsListening(true);

    dictationRef.current = startSpeechDictation({
      lang: targetLanguage,
      onInterim: (interim) => setChatInput(interim),
      onFinal: (finalText) => {
        setChatInput("");
        void handleSendChat(finalText);
      },
      onError: (msg) => {
        setChatError(msg);
        setIsListening(false);
      },
      onEnd: () => setIsListening(false),
    });
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExplainError(null);

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      setExplainError("Valitse JPG-, PNG- tai WebP-kuva.");
      return;
    }
    if (file.size > 2_500_000) {
      setExplainError("Kuva on liian suuri (enintään 2,5 Mt).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setExplainImage({
          dataUrl: reader.result,
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExplainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!explainInput.trim() && !explainImage) || explainBusy) return;

    setExplainBusy(true);
    setExplainError(null);
    setExplainResult(null);

    try {
      const reply = await explainTextOrImage({
        nativeLanguage,
        targetLanguage,
        level,
        text: explainInput.trim(),
        imageBase64: explainImage?.dataUrl,
        imageMimeType: explainImage?.mimeType,
      });
      setExplainResult(reply);
    } catch (err) {
      setExplainError(
        err instanceof Error ? err.message : "Selitystä ei saatu haettua.",
      );
    } finally {
      setExplainBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-3xl flex-col px-4 pt-3">
      {/* Välilehdet: Keskustele / Selitä */}
      <div
        role="tablist"
        aria-label="Opettajan tilat"
        className="grid shrink-0 grid-cols-2 rounded-xl border border-[#DCE5DF] bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
          className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "chat"
              ? "bg-[#1E3F35] text-white"
              : "text-[#4A5D55]"
          }`}
        >
          Keskustele
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "explain"}
          onClick={() => setActiveTab("explain")}
          className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "explain"
              ? "bg-[#1E3F35] text-white"
              : "text-[#4A5D55]"
          }`}
        >
          Selitä
        </button>
      </div>

      {activeTab === "chat" ? (
        <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
          {/* Roolipeli-valitsin */}
          <div className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {ROLEPLAY_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setRoleplay(sc.id)}
                aria-pressed={roleplay === sc.id}
                className={`min-h-[44px] shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors ${
                  roleplay === sc.id
                    ? "border-[#2D6A4F] bg-[#EAF2EE] text-[#1E3F35]"
                    : "border-[#D4DFD9] bg-white text-[#4A5D55]"
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Keskustelualue */}
          <div className="my-2 flex-1 space-y-2.5 overflow-y-auto rounded-2xl border border-[#DCE5DF] bg-white p-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <p className="text-sm font-semibold text-[#142620]">
                  Harjoittele kieltä {LANGUAGE_LABELS[targetLanguage]} opettajan
                  kanssa
                </p>
                <p className="mt-1 text-xs text-[#4A5D55]">
                  Aloita valmiilla aiheella tai kirjoita vapaasti.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {TUTOR_STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => void handleSendChat(starter)}
                      className="min-h-[44px] rounded-full border border-[#D4DFD9] bg-[#FAF9F6] px-4 text-xs font-semibold text-[#1E3F35] hover:bg-[#EAF2EE]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "bg-[#1E3F35] text-white"
                          : "bg-[#EAF2EE] text-[#142620]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => {
                            unlockSpeechSynthesis();
                            speakText(
                              extractTargetSpeech(msg.content),
                              targetLanguage,
                            );
                          }}
                          aria-label="Kuuntele opettajan viesti"
                          className="mt-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-[#1E3F35]"
                        >
                          <Volume2 size={14} />
                          <span>Kuuntele</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {chatBusy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[#EAF2EE] px-4 py-2.5 text-xs font-medium text-[#385348]">
                  Opettaja kirjoittaa...
                </div>
              </div>
            )}
          </div>

          {chatError && (
            <p
              role="alert"
              className="mb-2 rounded-xl border border-[#E5C5C3] bg-[#FDF3F2] px-3 py-2 text-xs text-[#8C2D28]"
            >
              {chatError}
            </p>
          )}

          {/* Viestikenttä */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendChat();
            }}
            className="flex shrink-0 items-center gap-2 pb-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Kirjoita (${LANGUAGE_LABELS[targetLanguage]} tai ${LANGUAGE_LABELS[nativeLanguage]})...`}
              aria-label="Viesti opettajalle"
              className="min-h-[48px] min-w-0 flex-1 rounded-2xl border border-[#C6D5CC] bg-white px-3.5 text-sm text-[#142620] outline-none focus:border-[#1E3F35]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatBusy}
              aria-label="Lähetä viesti"
              className="flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-2xl bg-[#2D6A4F] text-white disabled:opacity-40"
            >
              <Send size={18} />
            </button>
            {micPermission !== "denied" && (
              <button
                type="button"
                onClick={() => void handleMicTap()}
                aria-label={isListening ? "Lopeta sanelu" : "Sanele viesti"}
                className={`flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-2xl text-white ${
                  isListening ? "bg-[#8C2D28]" : "bg-[#1E3F35]"
                }`}
              >
                {isListening ? <Square size={18} /> : <Mic size={20} />}
              </button>
            )}
          </form>
        </div>
      ) : (
        /* Selitä-välilehti (Kieliapuri) */
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
          <form
            onSubmit={handleExplainSubmit}
            className="space-y-3 rounded-2xl border border-[#DCE5DF] bg-white p-4"
          >
            <p className="text-sm font-semibold text-[#142620]">
              Selitä kyltti, ruokalista tai lause
            </p>
            <textarea
              rows={3}
              value={explainInput}
              onChange={(e) => setExplainInput(e.target.value)}
              placeholder="Liitä vieraskielinen teksti tai kysy mitä jokin lause tarkoittaa..."
              aria-label="Selitettävä teksti"
              className="w-full rounded-xl border border-[#C6D5CC] bg-[#FAF9F6] p-3 text-sm text-[#142620] outline-none focus:border-[#1E3F35]"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImagePick}
              className="hidden"
            />

            {explainImage && (
              <div className="relative overflow-hidden rounded-xl border border-[#D4DFD9] bg-[#FAF9F6] p-2">
                <img
                  src={explainImage.dataUrl}
                  alt="Valittu kuva selitettäväksi"
                  className="mx-auto max-h-40 rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={() => setExplainImage(null)}
                  aria-label="Poista kuva"
                  className="absolute right-2 top-2 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-white/90 text-[#142620] shadow-sm"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D4DFD9] bg-white px-3.5 text-sm font-medium text-[#142620] hover:bg-[#EFF5F1]"
              >
                <Camera size={17} aria-hidden="true" />
                <span>{explainImage ? "Vaihda kuva" : "Lisää kuva"}</span>
              </button>

              <button
                type="submit"
                disabled={(!explainInput.trim() && !explainImage) || explainBusy}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E3F35] px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                <Sparkles size={16} aria-hidden="true" />
                <span>{explainBusy ? "Selitetään..." : "Selitä"}</span>
              </button>
            </div>
          </form>

          {explainError && (
            <p
              role="alert"
              className="rounded-2xl border border-[#E5C5C3] bg-[#FDF3F2] p-3 text-xs text-[#8C2D28]"
            >
              {explainError}
            </p>
          )}

          {explainResult && (
            <div className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
              <h2 className="text-sm font-bold text-[#1E3F35]">
                Käännös ja selitys
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#142620]">
                {explainResult}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
