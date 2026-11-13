/// <reference types="node" />
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

/**
 * Expo SQLite provides persistent localStorage for native app sessions.
 * The publishable key is intentionally public; database access is constrained
 * by Supabase Auth and row-level security policies.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: globalThis.localStorage,
      },
    })
  : null;
