import type { UserLanguagePreferences } from "../types/preferences";
import { DEFAULT_LANGUAGE_PREFERENCES } from "../config/languages";
import { supabase } from "../lib/supabase";

type PreferenceRow = {
  interface_language: string;
  native_language: string;
  learning_language: string;
  interpretation_source_language: string;
  interpretation_target_language: string;
};

function toPreferences(row: PreferenceRow): UserLanguagePreferences {
  return {
    interfaceLanguage: row.interface_language,
    nativeLanguage: row.native_language,
    learningLanguage: row.learning_language,
    interpretationSourceLanguage: row.interpretation_source_language,
    interpretationTargetLanguage: row.interpretation_target_language,
  };
}

function toRow(userId: string, preferences: UserLanguagePreferences) {
  return {
    user_id: userId,
    interface_language: preferences.interfaceLanguage,
    native_language: preferences.nativeLanguage,
    learning_language: preferences.learningLanguage,
    interpretation_source_language: preferences.interpretationSourceLanguage,
    interpretation_target_language: preferences.interpretationTargetLanguage,
  };
}

export async function loadLanguagePreferences(
  userId: string,
): Promise<UserLanguagePreferences> {
  if (!supabase) throw new Error("Supabase-yhteyttä ei ole määritetty.");

  const { data, error } = await supabase
    .from("user_language_preferences")
    .select(
      "interface_language,native_language,learning_language,interpretation_source_language,interpretation_target_language",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toPreferences(data as PreferenceRow) : { ...DEFAULT_LANGUAGE_PREFERENCES };
}

export async function saveLanguagePreferences(
  userId: string,
  preferences: UserLanguagePreferences,
): Promise<UserLanguagePreferences> {
  if (!supabase) throw new Error("Supabase-yhteyttä ei ole määritetty.");

  const { data, error } = await supabase
    .from("user_language_preferences")
    .upsert(toRow(userId, preferences), { onConflict: "user_id" })
    .select(
      "interface_language,native_language,learning_language,interpretation_source_language,interpretation_target_language",
    )
    .single();

  if (error) throw error;
  return toPreferences(data as PreferenceRow);
}
