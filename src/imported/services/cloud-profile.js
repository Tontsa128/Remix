import { supabase } from '../lib/supabase';
import { DEFAULT_LEARNING_PROFILE } from './local-learning-profile';
export async function loadCloudProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('display_name,daily_goal_minutes,weekly_goal_days').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? { displayName: data.display_name, dailyGoalMinutes: data.daily_goal_minutes, weeklyGoalDays: data.weekly_goal_days } : { ...DEFAULT_LEARNING_PROFILE };
}
export async function saveCloudProfile(userId, profile) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, display_name: profile.displayName, daily_goal_minutes: profile.dailyGoalMinutes, weekly_goal_days: profile.weeklyGoalDays });
  if (error) throw error;
}