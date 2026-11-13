import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { LESSONS } from "@/data/lessons";
import { getDueReviewItems } from "@/services/storage";
import type { Lesson, LessonCategory, UserProgressState } from "@/types/elovio";

type FilterValue = "Kaikki" | "Kertaus" | LessonCategory;

const FILTERS: FilterValue[] = [
  "Kaikki",
  "Kertaus",
  "Perussanasto",
  "Arki",
  "Ruoka & juoma",
  "Matkustus",
  "Terveys",
];

interface ExercisesScreenProps {
  progress: UserProgressState;
  onStartLesson: (lesson: Lesson) => void;
  onStartReview: () => void;
}

export function ExercisesScreen({
  progress,
  onStartLesson,
  onStartReview,
}: ExercisesScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterValue>("Kaikki");

  const learnedSet = useMemo(
    () => new Set(progress.learnedSentenceIds),
    [progress.learnedSentenceIds],
  );
  const completedSet = useMemo(
    () => new Set(progress.completedLessonIds),
    [progress.completedLessonIds],
  );
  const dueItems = useMemo(() => getDueReviewItems(progress), [progress]);

  const filteredLessons = useMemo(() => {
    if (selectedFilter === "Kaikki") return LESSONS;
    if (selectedFilter === "Kertaus") {
      const dueLessonIds = new Set(dueItems.map((i) => i.lessonId));
      return LESSONS.filter((l) => dueLessonIds.has(l.id));
    }
    return LESSONS.filter((l) => l.category === selectedFilter);
  }, [selectedFilter, dueItems]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-24 pt-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-[#142620]">
          Harjoitukset
        </h1>
        <p className="mt-0.5 text-sm text-[#4A5D55]">
          Valitse tilanne. Jokainen harjoitus avautuu omaan näkymään.
        </p>
      </header>

      {/* Vaakasuunnassa selattavat suodinchipit */}
      <div
        role="tablist"
        aria-label="Harjoitusten suodattimet"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {FILTERS.map((filter) => {
          const active = selectedFilter === filter;
          const label =
            filter === "Kertaus" && dueItems.length > 0
              ? `Kertaus (${dueItems.length})`
              : filter;
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedFilter(filter)}
              className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                active
                  ? "border-[#1E3F35] bg-[#1E3F35] text-white"
                  : "border-[#D4DFD9] bg-white text-[#142620] hover:bg-[#EFF5F1]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Kertauskortti jos kerrattavaa on */}
      {dueItems.length > 0 &&
        (selectedFilter === "Kaikki" || selectedFilter === "Kertaus") && (
          <button
            type="button"
            onClick={onStartReview}
            className="flex min-h-[68px] w-full items-center justify-between gap-3 rounded-2xl border border-[#2D6A4F] bg-[#EAF2EE] p-4 text-left transition-colors hover:bg-[#DFECE5]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E3F35] text-white">
                <RefreshCw size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#142620]">
                  Päivän kertaus ({dueItems.length} ilmausta)
                </p>
                <p className="text-xs text-[#385348]">
                  Vahvista aiemmin väärin menneet ilmaisut
                </p>
              </div>
            </div>
            <ChevronRight
              size={20}
              className="shrink-0 text-[#1E3F35]"
              aria-hidden="true"
            />
          </button>
        )}

      {/* Korttilista tai tyhjä tila */}
      {filteredLessons.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE5DF] bg-white p-6 text-center">
          <p className="text-sm font-semibold text-[#142620]">
            Ei kerrattavia ilmaisuja juuri nyt
          </p>
          <p className="mt-1 text-xs text-[#4A5D55]">
            Hienoa! Kun harjoittelet lisää, mahdolliset vaikeat ilmaisut
            nousevat automaattisesti tänne.
          </p>
          <button
            type="button"
            onClick={() => setSelectedFilter("Kaikki")}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#1E3F35] px-4 text-sm font-semibold text-white"
          >
            Näytä kaikki harjoitukset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredLessons.map((lesson) => {
            const totalCount = lesson.sentences.length;
            const learnedInLesson = lesson.sentences.filter((s) =>
              learnedSet.has(s.id),
            ).length;
            const isCompleted = completedSet.has(lesson.id);

            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onStartLesson(lesson)}
                className="flex min-h-[88px] w-full items-center justify-between gap-3 rounded-2xl border border-[#DCE5DF] bg-white p-4 text-left transition-colors hover:border-[#2D6A4F] hover:bg-[#F6FAF7]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#4A5D55]">
                    <span>{lesson.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {totalCount}{" "}
                      {lesson.kind === "word" ? "sanaa" : "ilmausta"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {lesson.estimatedMinutes} min
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-[#142620]">
                    {lesson.title}
                  </h2>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[#4A5D55]">
                    {lesson.subtitle}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E8F0EC]">
                      <div
                        className="h-full rounded-full bg-[#2D6A4F]"
                        style={{
                          width: `${Math.round((learnedInLesson / Math.max(1, totalCount)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-[#1E3F35]">
                      {learnedInLesson}/{totalCount}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center text-[#1E3F35]">
                  {isCompleted ? (
                    <CheckCircle2 size={22} aria-label="Suoritettu" />
                  ) : (
                    <ChevronRight size={20} aria-hidden="true" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
