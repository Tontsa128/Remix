import { useState } from "react";
import { Check, Copy, Download, LogIn, LogOut, Mic, RotateCcw, Smartphone, X } from "lucide-react";
import { LANGUAGE_LABELS } from "@/data/lessons";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  buildShareLearningUrl,
  copyTextToClipboard,
  isDevPreviewOrigin,
} from "@/services/share-link";
import type {
  AccountUser,
  LanguageCode,
  MicPermissionState,
  UserPreferences,
} from "@/types/elovio";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onChangePreferences: (next: UserPreferences) => void;
  user: AccountUser | null;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  micPermission: MicPermissionState;
  onResetProgress: () => void;
  onShareLearningPath?: () => Promise<{ url: string; copied: boolean }>;
  learnedCount?: number;
}

const LANGUAGES: LanguageCode[] = ["fi", "es", "en"];
const GOAL_OPTIONS = [5, 10, 15, 20];

export function SettingsModal({
  isOpen,
  onClose,
  preferences,
  onChangePreferences,
  user,
  onGoogleSignIn,
  onSignOut,
  micPermission,
  onResetProgress,
  onShareLearningPath,
  learnedCount = 0,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleShareOrCopy = async () => {
    const result = onShareLearningPath
      ? await onShareLearningPath()
      : await (async () => {
          const url = buildShareLearningUrl({
            progress: {
              preferences,
              learnedSentenceIds: [],
              completedLessonIds: [],
              studySecondsByDate: {},
              liveSecondsByDate: {},
              reviewQueue: [],
            },
          });
          const copied = await copyTextToClipboard(url);
          return { url, copied };
        })();

    setGeneratedUrl(result.url);
    setCopiedLink(result.copied);
    window.setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleNativeChange = (lang: LanguageCode) => {
    let nextTarget = preferences.targetLanguage;
    if (nextTarget === lang) {
      nextTarget = lang === "es" ? "fi" : "es";
    }
    onChangePreferences({
      ...preferences,
      nativeLanguage: lang,
      targetLanguage: nextTarget,
    });
  };

  const handleTargetChange = (lang: LanguageCode) => {
    let nextNative = preferences.nativeLanguage;
    if (nextNative === lang) {
      nextNative = lang === "fi" ? "es" : "fi";
    }
    onChangePreferences({
      ...preferences,
      nativeLanguage: nextNative,
      targetLanguage: lang,
    });
  };

  const micLabel =
    micPermission === "granted"
      ? "Sallittu"
      : micPermission === "denied"
        ? "Estetty selaimen asetuksista"
        : "Pyydetään ensimmäisellä painalluksella";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-heading"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#FAF9F6] p-5 text-[#142620] shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#E2EAE5] pb-3">
          <h2 id="settings-heading" className="text-lg font-bold">
            Asetukset
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sulje asetukset"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#4A5D55] hover:bg-[#E8F0EC]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Äidinkieleni */}
          <section>
            <h3 className="text-sm font-semibold text-[#142620]">
              Äidinkieleni
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LANGUAGES.map((code) => {
                const selected = preferences.nativeLanguage === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleNativeChange(code)}
                    aria-pressed={selected}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
                      selected
                        ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                        : "border-[#D4DFD9] bg-white text-[#142620] hover:bg-[#EFF5F1]"
                    }`}
                  >
                    {selected && <Check size={15} aria-hidden="true" />}
                    <span>{LANGUAGE_LABELS[code]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Opiskeltava kieli */}
          <section>
            <h3 className="text-sm font-semibold text-[#142620]">
              Opiskeltava kieli
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LANGUAGES.map((code) => {
                const selected = preferences.targetLanguage === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleTargetChange(code)}
                    aria-pressed={selected}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
                      selected
                        ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                        : "border-[#D4DFD9] bg-white text-[#142620] hover:bg-[#EFF5F1]"
                    }`}
                  >
                    {selected && <Check size={15} aria-hidden="true" />}
                    <span>{LANGUAGE_LABELS[code]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Päivittäinen tavoite */}
          <section>
            <h3 className="text-sm font-semibold text-[#142620]">
              Päivittäinen tavoite
            </h3>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {GOAL_OPTIONS.map((mins) => {
                const selected = preferences.dailyGoalMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      onChangePreferences({
                        ...preferences,
                        dailyGoalMinutes: mins,
                      })
                    }
                    aria-pressed={selected}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium tabular-nums transition-colors ${
                      selected
                        ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                        : "border-[#D4DFD9] bg-white text-[#142620] hover:bg-[#EFF5F1]"
                    }`}
                  >
                    {mins} min
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sovellus puhelimeen ja jakaminen */}
          <section className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#1E3F35]">
                <Smartphone size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#142620]">
                  Sovellus puhelimeen ja oppimispolun jako
                </p>
                <p className="mt-0.5 text-xs text-[#4A5D55]">
                  {isInstalled
                    ? "Elovio on asennettuna tälle laitteelle."
                    : isIOS
                      ? "iPhone: avaa Safarissa, napauta Jaa ja valitse Lisää Koti-valikkoon."
                      : "Android: avaa Chromessa ja valitse Asenna sovellus tai Lisää aloitusnäyttöön."}
                </p>
                <p className="mt-1 text-[11px] text-[#5C6F67]">
                  Jaettava linkki sisältää kieliparisi (
                  {LANGUAGE_LABELS[preferences.nativeLanguage]} →{" "}
                  {LANGUAGE_LABELS[preferences.targetLanguage]}) ja edistymisesi (
                  {learnedCount} opittua).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isInstalled && isInstallable && (
                    <button
                      type="button"
                      onClick={() => void install()}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#1E3F35] px-3.5 text-xs font-semibold text-white"
                    >
                      <Download size={15} aria-hidden="true" />
                      <span>Asenna tämä laite</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleShareOrCopy()}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#D4DFD9] bg-[#FAF9F6] px-3.5 text-xs font-semibold text-[#1E3F35] hover:bg-[#EFF5F1]"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={15} aria-hidden="true" />
                        <span>Oppimispolun linkki kopioitu</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} aria-hidden="true" />
                        <span>Luo & kopioi polkulinkki</span>
                      </>
                    )}
                  </button>
                </div>
                {generatedUrl && (
                  <div
                    role="status"
                    className="mt-2 rounded-lg bg-[#FAF9F6] px-2.5 py-1.5 text-[11px] text-[#385348]"
                  >
                    <p className="truncate font-mono">{generatedUrl}</p>
                    {isDevPreviewOrigin() && (
                      <p className="mt-1 text-[#4A5D55]">
                        Muista kytkeä AI Studion yläpalkista{" "}
                        <strong>Share</strong> päälle tai käyttää{" "}
                        <strong>Deploy</strong>-julkaisua, jotta{" "}
                        <code>ais-pre-</code> tai Cloud Run -osoite aukeaa
                        muille.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Mikrofonin tila */}
          <section className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#1E3F35]">
                <Mic size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#142620]">
                  Mikrofonin lupa
                </p>
                <p className="text-xs text-[#4A5D55]">{micLabel}</p>
              </div>
            </div>
          </section>

          {/* Käyttäjätili */}
          <section className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#142620]">
              Käyttäjätili
            </h3>
            {user ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#142620]">
                    {user.user_metadata?.full_name || user.name || user.email}
                  </p>
                  <p className="truncate text-xs text-[#4A5D55]">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={async () => {
                    setAuthBusy(true);
                    try {
                      await onSignOut();
                    } finally {
                      setAuthBusy(false);
                    }
                  }}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[#D4DFD9] px-3 text-sm font-medium text-[#142620] hover:bg-[#EFF5F1]"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Kirjaudu ulos</span>
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <p className="mb-3 text-xs text-[#4A5D55]">
                  Kirjaudu Google-tilillä, jotta harjoitustietosi pysyvät
                  tallessa.
                </p>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={async () => {
                    setAuthBusy(true);
                    try {
                      await onGoogleSignIn();
                    } finally {
                      setAuthBusy(false);
                    }
                  }}
                  className="elovio-google-button"
                >
                  <LogIn size={16} aria-hidden="true" />
                  <span>Kirjaudu Google-tilillä</span>
                </button>
              </div>
            )}
          </section>

          {/* Edistymisen nollaus */}
          <section className="border-t border-[#E2EAE5] pt-4">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#E5C5C3] bg-white px-4 text-sm font-medium text-[#8C2D28] hover:bg-[#FDF3F2]"
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span>Nollaa harjoitushistoria</span>
              </button>
            ) : (
              <div className="rounded-2xl border border-[#E5C5C3] bg-[#FDF3F2] p-3">
                <p className="text-xs font-medium text-[#8C2D28]">
                  Haluatko varmasti poistaa opitut ilmaisut ja kertausjonon?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="min-h-[44px] flex-1 rounded-xl bg-[#8C2D28] px-3 text-sm font-semibold text-white"
                  >
                    Kyllä, nollaa
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[44px] flex-1 rounded-xl border border-[#D4DFD9] bg-white px-3 text-sm font-medium text-[#142620]"
                  >
                    Peruuta
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
