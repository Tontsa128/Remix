import { useState } from "react";
import {
  ArrowRight,
  Check,
  GraduationCap,
  Headphones,
  Languages,
  Play,
  Share2,
} from "lucide-react";
import { LANGUAGE_LABELS, LESSONS } from "@/data/lessons";
import {
  buildShareLearningUrl,
  copyTextToClipboard,
  isDevPreviewOrigin,
} from "@/services/share-link";
import {
  getComputedLevel,
  getDueReviewItems,
  getTodayStudiedMinutes,
  getWeeklyActivity,
} from "@/services/storage";
import type { TabId, UserProgressState } from "@/types/elovio";

interface HomeScreenProps {
  progress: UserProgressState;
  onContinueExercise: () => void;
  onStartListeningSchool: () => void;
  onShareLearningPath?: () => Promise<{ url: string; copied: boolean }>;
  onNavigateTab: (tab: TabId) => void;
}

export function HomeScreen({
  progress,
  onContinueExercise,
  onStartListeningSchool,
  onShareLearningPath,
  onNavigateTab,
}: HomeScreenProps) {
  const [sharedUrlPreview, setSharedUrlPreview] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const todayMinutes = getTodayStudiedMinutes(progress);
  const goalMinutes = progress.preferences.dailyGoalMinutes;
  const goalPercent = Math.min(
    100,
    Math.round((todayMinutes / Math.max(1, goalMinutes)) * 100),
  );
  const weekDays = getWeeklyActivity(progress);
  const activeDayCount = weekDays.filter((d) => d.active).length;
  const level = getComputedLevel(progress);
  const dueCount = getDueReviewItems(progress).length;
  const totalPhrases = LESSONS.reduce((sum, l) => sum + l.sentences.length, 0);
  const learnedCount = progress.learnedSentenceIds.length;

  const targetName = LANGUAGE_LABELS[progress.preferences.targetLanguage];

  const handleShareClick = async () => {
    const result = onShareLearningPath
      ? await onShareLearningPath()
      : await (async () => {
          const url = buildShareLearningUrl({ progress, activeTab: "home" });
          const copied = await copyTextToClipboard(url);
          return { url, copied };
        })();
    setSharedUrlPreview(result.url);
    setShareCopied(result.copied);
    window.setTimeout(() => {
      setShareCopied(false);
    }, 3000);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-24 pt-4">
      {/* Yleinen tervehdys kaikille käyttäjille ja oppimispolun jako */}
      <section className="rounded-3xl bg-[#1E3F35] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-[#B6D4C6]">
              Opiskeltava kieli: {targetName}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Tervetuloa Elovioon!
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void handleShareClick()}
            aria-label="Jaa oppimispolku ja edistyminen linkkinä"
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/25"
          >
            {shareCopied ? (
              <>
                <Check size={15} aria-hidden="true" />
                <span>Kopioitu!</span>
              </>
            ) : (
              <>
                <Share2 size={15} aria-hidden="true" />
                <span>Jaa polku</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-1 text-sm text-[#D7E8DF]">
          Taso: <span className="font-semibold text-white">{level}</span> ·{" "}
          <span className="tabular-nums">
            {learnedCount} / {totalPhrases}
          </span>{" "}
          sanaa ja lausetta opittu
        </p>

        {sharedUrlPreview && (
          <div
            role="status"
            className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-[#E8F3ED]"
          >
            <p className="truncate">
              {shareCopied
                ? "Oppimispolun linkki kopioitu leikepöydälle: "
                : "Oppimispolun linkki: "}
              <span className="font-mono text-[11px]">{sharedUrlPreview}</span>
            </p>
            {isDevPreviewOrigin() && (
              <p className="mt-1 text-[11px] text-[#B6D4C6]">
                Vinkki: kytke AI Studion yläreunasta <strong>Share</strong>{" "}
                päälle (tai <strong>Deploy</strong>), jotta jaettu osoite
                aukeaa vaimosi puhelimella.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Omistettu pääpainike: Pelkkä kuuntelukoulu (heti ensimmäisenä etusivulla) */}
      <button
        type="button"
        onClick={onStartListeningSchool}
        className="flex min-h-[68px] w-full items-center justify-between rounded-2xl bg-[#1E3F35] px-5 py-4 text-left text-white shadow-sm transition-transform active:scale-[0.99] hover:bg-[#17322A]"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1E3F35]">
            <Headphones size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold leading-snug">
              Aloita pelkkä kuuntelukoulu
            </p>
            <p className="mt-0.5 text-xs text-[#D7E8DF]">
              Vain äänikuuntelu · {totalPhrases} sanaa ja lausetta ({targetName})
            </p>
          </div>
        </div>
        <ArrowRight size={20} className="shrink-0" aria-hidden="true" />
      </button>

      {/* Päivän tavoite ja viikon aktiivisuus */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[#142620]">
              Päivän tavoite
            </h2>
            <span className="text-sm font-bold tabular-nums text-[#1E3F35]">
              {todayMinutes} / {goalMinutes} min
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={goalPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Päivän opiskelutavoite"
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E8F0EC]"
          >
            <div
              className="h-full rounded-full bg-[#2D6A4F] transition-all duration-300"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#4A5D55]">
            {todayMinutes >= goalMinutes
              ? "Hienoa, päivän tavoite täynnä!"
              : `${goalMinutes - todayMinutes} min jäljellä tämän päivän tavoitteeseen`}
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[#142620]">
              Viikon aktiivisuus
            </h2>
            <span className="text-sm font-bold tabular-nums text-[#1E3F35]">
              {activeDayCount} / 7 pv
            </span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {weekDays.map((day) => (
              <div
                key={day.dateKey}
                className="flex flex-col items-center gap-1"
              >
                <div
                  title={`${day.label}: ${day.minutes} min`}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${
                    day.active
                      ? "bg-[#1E3F35] text-white"
                      : "bg-[#EFF4F1] text-[#5C6F67]"
                  }`}
                >
                  {day.active ? "✓" : "·"}
                </div>
                <span className="text-[11px] font-medium text-[#5C6F67]">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Harjoitukset */}
      <button
        type="button"
        onClick={onContinueExercise}
        className="flex min-h-[58px] w-full items-center justify-between rounded-2xl border border-[#2D6A4F] bg-[#EAF2EE] px-5 py-3.5 text-left transition-colors hover:bg-[#DFECE5]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E3F35] text-white">
            <Play size={18} fill="currentColor" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#142620]">
              Jatka kirjoitus- ja kuunteluharjoitusta
            </p>
            <p className="text-xs text-[#385348]">
              {dueCount > 0
                ? `${dueCount} ilmausta odottaa kertausta`
                : "Jatka seuraavaan käytännön tilanteeseen"}
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="text-[#1E3F35]" aria-hidden="true" />
      </button>

      {/* Pikapainikkeet Tulkkiin ja Opettajaan */}
      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab("interpreter")}
          className="flex min-h-[76px] flex-col items-start justify-between rounded-2xl border border-[#DCE5DF] bg-white p-4 text-left transition-colors hover:bg-[#F3F8F5]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#1E3F35]">
            <Languages size={20} aria-hidden="true" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold text-[#142620]">Tulkki</p>
            <p className="text-xs text-[#4A5D55]">Puhe & Live-käännös</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("tutor")}
          className="flex min-h-[76px] flex-col items-start justify-between rounded-2xl border border-[#DCE5DF] bg-white p-4 text-left transition-colors hover:bg-[#F3F8F5]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#1E3F35]">
            <GraduationCap size={20} aria-hidden="true" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold text-[#142620]">Opettaja</p>
            <p className="text-xs text-[#4A5D55]">Keskustelu & Selitä</p>
          </div>
        </button>
      </section>
    </div>
  );
}
