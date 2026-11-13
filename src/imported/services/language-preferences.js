import { DEFAULT_LANGUAGE_PREFERENCES } from "../config/languages";
import { supabase } from "../lib/supabase";
function toPreferences(row) {
    return {
        interfaceLanguage: row.interface_language,
        nativeLanguage: row.native_language,
        learningLanguage: row.learning_language,
        interpretationSourceLanguage: row.interpretation_source_language,
        interpretationTargetLanguage: row.interpretation_target_language,
    };
}
function toRow(userId, preferences) {
    return {
        user_id: userId,
        interface_language: preferences.interfaceLanguage,
        native_language: preferences.nativeLanguage,
        learning_language: preferences.learningLanguage,
        interpretation_source_language: preferences.interpretationSourceLanguage,
        interpretation_target_language: preferences.interpretationTargetLanguage,
    };
}
export async function loadLanguagePreferences(userId) {
    if (!supabase)
        throw new Error("Supabase-yhteyttä ei ole määritetty.");
    const { data, error } = await supabase
        .from("user_language_preferences")
        .select("interface_language,native_language,learning_language,interpretation_source_language,interpretation_target_language")
        .eq("user_id", userId)
        .maybeSingle();
    if (error)
        throw error;
    return data ? toPreferences(data) : { ...DEFAULT_LANGUAGE_PREFERENCES };
}
export async function saveLanguagePreferences(userId, preferences) {
    if (!supabase)
        throw new Error("Supabase-yhteyttä ei ole määritetty.");
    const { data, error } = await supabase
        .from("user_language_preferences")
        .upsert(toRow(userId, preferences), { onConflict: "user_id" })
        .select("interface_language,native_language,learning_language,interpretation_source_language,interpretation_target_language")
        .single();
    if (error)
        throw error;
    return toPreferences(data);
}
