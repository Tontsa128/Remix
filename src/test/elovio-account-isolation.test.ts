import { afterEach, describe, expect, it } from 'vitest';
import { setStorageAccount } from '@/imported/services/account-storage';
import { loadLocalLearningProfile, saveLocalLearningProfile } from '@/imported/services/local-learning-profile';
import { loadLocalLearningProgress, saveLocalLearningProgress } from '@/imported/services/local-learning-progress';
import { STARTER_PHRASES } from '@/imported/content/initial-phrases';

afterEach(() => { setStorageAccount(null); localStorage.clear(); });
describe('Private learning data', () => {
  it('does not copy one account profile into another account', () => {
    setStorageAccount('learner-a');
    saveLocalLearningProfile({ displayName: 'Learner A', dailyGoalMinutes: 30, weeklyGoalDays: 7 });
    setStorageAccount('learner-b');
    expect(loadLocalLearningProfile().displayName).toBe('');
    setStorageAccount('learner-a');
    expect(loadLocalLearningProfile().displayName).toBe('Learner A');
  });
  it('does not show private completed phrases after sign-out', () => {
    const phrase = STARTER_PHRASES[0];
    expect(phrase).toBeDefined();
    if (!phrase) throw new Error('Missing lesson content');
    setStorageAccount('learner-a');
    saveLocalLearningProgress({ completedPhraseIds: [phrase.id], reviewedPhraseIds: [], reviewSchedule: {}, reviewHistory: [] });
    setStorageAccount(null);
    expect(loadLocalLearningProgress().completedPhraseIds).toEqual([]);
    setStorageAccount('learner-a');
    expect(loadLocalLearningProgress().completedPhraseIds).toEqual([phrase.id]);
  });
});