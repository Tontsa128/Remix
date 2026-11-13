function buildProgress(currentValue, targetValue) {
    const current = Number.isFinite(currentValue) ? Math.max(0, Math.floor(currentValue)) : 0;
    const target = Number.isFinite(targetValue) ? Math.max(1, Math.floor(targetValue)) : 1;
    return {
        current,
        target,
        percent: Math.min(100, Math.round((current / target) * 100)),
        completed: current >= target,
    };
}
/** Calculates bounded progress for the user's daily and weekly goals. */
export function getLearningGoalProgress(input) {
    const todayMinutes = Number.isFinite(input.todaySeconds)
        ? Math.max(0, Math.floor(input.todaySeconds / 60))
        : 0;
    return {
        daily: buildProgress(todayMinutes, input.dailyGoalMinutes),
        weekly: buildProgress(input.weekDays, input.weeklyGoalDays),
    };
}
