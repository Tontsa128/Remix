import { STARTER_PHRASES } from "../content/initial-phrases";
const KNOWN_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60];
const RETRY_DELAY_MINUTES = 10;
const MAX_REVIEW_HISTORY = 500;
export function recordPhraseReview(progress, phraseId, knewIt, now = new Date()) {
    if (!STARTER_PHRASES.some((phrase) => phrase.id === phraseId)) {
        return progress;
    }
    const reviewedAt = now.toISOString();
    const previous = progress.reviewSchedule[phraseId];
    const repetitions = knewIt ? (previous?.repetitions ?? 0) + 1 : 0;
    const intervalDays = knewIt
        ? KNOWN_INTERVAL_DAYS[Math.min(repetitions - 1, KNOWN_INTERVAL_DAYS.length - 1)]
        : 0;
    const dueDate = new Date(now.getTime());
    if (knewIt) {
        dueDate.setUTCDate(dueDate.getUTCDate() + intervalDays);
    }
    else {
        dueDate.setUTCMinutes(dueDate.getUTCMinutes() + RETRY_DELAY_MINUTES);
    }
    const dueAt = dueDate.toISOString();
    const scheduleEntry = {
        repetitions,
        intervalDays,
        dueAt,
        lastReviewedAt: reviewedAt,
        lapses: (previous?.lapses ?? 0) + (knewIt ? 0 : 1),
    };
    const historyEntry = {
        phraseId,
        result: knewIt ? "known" : "again",
        reviewedAt,
        dueAt,
        intervalDays,
    };
    return {
        completedPhraseIds: knewIt
            ? [...new Set([...progress.completedPhraseIds, phraseId])]
            : progress.completedPhraseIds.filter((id) => id !== phraseId),
        reviewedPhraseIds: [...new Set([...progress.reviewedPhraseIds, phraseId])],
        reviewSchedule: { ...progress.reviewSchedule, [phraseId]: scheduleEntry },
        reviewHistory: [...progress.reviewHistory, historyEntry].slice(-MAX_REVIEW_HISTORY),
    };
}
/** Returns a fixed copy of the cards due when a review session begins. */
export function createReviewQueue(progress, now = new Date()) {
    return [...getDuePhraseIds(progress, now)];
}
export function getDuePhraseIds(progress, now = new Date()) {
    const timestamp = now.getTime();
    return STARTER_PHRASES
        .filter((phrase) => {
        const dueAt = progress.reviewSchedule[phrase.id]?.dueAt;
        return typeof dueAt === "string" && Date.parse(dueAt) <= timestamp;
    })
        .map((phrase) => phrase.id);
}
export function getNextReviewAt(progress) {
    const dates = Object.values(progress.reviewSchedule)
        .map((entry) => Date.parse(entry.dueAt))
        .filter(Number.isFinite);
    if (dates.length === 0)
        return null;
    return new Date(Math.min(...dates)).toISOString();
}
