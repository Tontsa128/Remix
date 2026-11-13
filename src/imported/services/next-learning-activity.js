import { STARTER_PHRASES } from "../content/initial-phrases";
import { VISUAL_VOCABULARY } from "../content/visual-vocabulary";
export function getNextLearningActivity(learning, visual, now = new Date()) {
    const latestResultByPhrase = new Map();
    for (const item of learning.reviewHistory) {
        const schedule = learning.reviewSchedule[item.phraseId];
        if (!schedule)
            continue;
        const reviewedAt = Date.parse(item.reviewedAt);
        const lastReviewedAt = Date.parse(schedule.lastReviewedAt);
        if (!Number.isFinite(reviewedAt) || !Number.isFinite(lastReviewedAt) || reviewedAt > lastReviewedAt)
            continue;
        const previous = latestResultByPhrase.get(item.phraseId);
        if (!previous || reviewedAt > previous.reviewedAt) {
            latestResultByPhrase.set(item.phraseId, { reviewedAt, result: item.result });
        }
    }
    const phraseOrder = new Map(STARTER_PHRASES.map((phrase, index) => [phrase.id, index]));
    const due = Object.entries(learning.reviewSchedule)
        .filter(([phraseId, schedule]) => phraseOrder.has(phraseId) &&
        Number.isFinite(Date.parse(schedule.dueAt)) &&
        Date.parse(schedule.dueAt) <= now.getTime())
        .sort(([leftId, left], [rightId, right]) => {
        const leftDifficult = latestResultByPhrase.get(leftId)?.result === "again" ? 1 : 0;
        const rightDifficult = latestResultByPhrase.get(rightId)?.result === "again" ? 1 : 0;
        return rightDifficult - leftDifficult ||
            Date.parse(left.dueAt) - Date.parse(right.dueAt) ||
            (phraseOrder.get(leftId) ?? Number.MAX_SAFE_INTEGER) -
                (phraseOrder.get(rightId) ?? Number.MAX_SAFE_INTEGER);
    });
    if (due.length > 0) {
        const [phraseId] = due[0];
        return {
            kind: "review",
            phraseId,
            reason: latestResultByPhrase.get(phraseId)?.result === "again" ? "difficult" : "due",
        };
    }
    const mastered = new Set(visual.masteredEntryIds);
    const nextVisual = VISUAL_VOCABULARY.find((entry) => !mastered.has(entry.id));
    if (nextVisual)
        return { kind: "visual", entryId: nextVisual.id, reason: "new-visual" };
    const completed = new Set(learning.completedPhraseIds);
    if (STARTER_PHRASES.some((phrase) => !completed.has(phrase.id))) {
        return { kind: "lesson", reason: "new-phrases" };
    }
    return { kind: "consolidate", reason: "all-mastered" };
}
