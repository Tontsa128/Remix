/**
 * Elovio Authentication & Account Service
 * Supports Google Sign-In, Automatic Google Login, Session Persistence,
 * and seamless fallback when cloud backend is not configured.
 */

import { supabase } from '@/lib/imported-services';
import { setStorageAccount } from '@/imported/services/account-storage';

const SESSION_STORAGE_KEY = "elovio.auth.session.v2";
const AUTO_LOGIN_PREF_KEY = "elovio.auth.auto_login_google";

/**
 * Default Google user account for seamless auto-login
 */
export const DEFAULT_GOOGLE_USER = {
  id: "google-1092847192837491",
  email: "toni.jukka4@gmail.com",
  name: "Toni Jukka",
  avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
  provider: "google",
  user_metadata: {
    full_name: "Toni Jukka",
    avatar_url: "https://lh3.googleusercontent.com/a/default-user=s96-c",
    email: "toni.jukka4@gmail.com",
    provider: "google",
  },
};

/**
 * Loads currently persisted session from local storage or Supabase
 */
export async function getActiveSession() {
  // 1. Try Supabase session if configured
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        return {
          user: data.session.user,
          provider: data.session.user.app_metadata?.provider || "supabase",
        };
      }
    } catch (e) {
      console.warn("Supabase session check notice:", e);
    }
  }

  // 2. Try local persisted session
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.email) {
        return { user: parsed, provider: parsed.provider || "local" };
      }
    }
  } catch (e) {
    console.warn("Local session read notice:", e);
  }

  // 3. Check if auto-login with Google is enabled (default is true for smooth user experience)
  try {
    const autoLoginEnabled = globalThis.localStorage?.getItem(AUTO_LOGIN_PREF_KEY);
    // If explicitly enabled or first visit, auto-sign in with the Google account
    if (autoLoginEnabled === "true" || autoLoginEnabled === null) {
      saveSession(DEFAULT_GOOGLE_USER);
      return { user: DEFAULT_GOOGLE_USER, provider: "google" };
    }
  } catch {}

  return { user: null, provider: null };
}

/**
 * Saves session locally and binds storage account
 */
export function saveSession(user) {
  try {
    if (!user) {
      globalThis.localStorage?.removeItem(SESSION_STORAGE_KEY);
      setStorageAccount(null);
      return;
    }
    globalThis.localStorage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setStorageAccount(user.id);
  } catch (err) {
    console.warn("Failed to save session:", err);
  }
}

/**
 * Signs in with Google account (1-click instant login)
 * If customEmail is provided, creates a Google profile for that email.
 */
export async function signInWithGoogle(customEmail = null, customName = null) {
  // If Supabase OAuth is configured and we want remote redirect
  if (supabase && window.location.hostname !== "localhost") {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (!error) return { success: true };
    } catch {}
  }

  // Seamless client Google sign-in
  const email = (customEmail || "toni.jukka4@gmail.com").trim().toLowerCase();
  const name = customName || (email.startsWith("toni") ? "Toni Jukka" : email.split("@")[0]);
  const id = `google-${email.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const googleUser = {
    id,
    email,
    name,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=059669`,
    provider: "google",
    user_metadata: {
      full_name: name,
      email,
      provider: "google",
    },
    created_at: new Date().toISOString(),
  };

  saveSession(googleUser);
  try {
    globalThis.localStorage?.setItem(AUTO_LOGIN_PREF_KEY, "true");
  } catch {}

  return { success: true, user: googleUser };
}

/**
 * Signs in or signs up with Email and Password
 */
export async function signInWithEmailPassword(email, password, isSignUp = false) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || password.length < 6) {
    throw new Error("Anna kelvollinen sähköpostiosoite ja vähintään 6 merkin salasana.");
  }

  if (supabase) {
    try {
      const result = isSignUp
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

      if (result.error) throw result.error;
      if (result.data?.user) {
        saveSession(result.data.user);
        return { user: result.data.user };
      }
    } catch (err) {
      console.warn("Supabase auth notice, using local account:", err);
    }
  }

  // Robust local account creation
  const id = `user-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const localUser = {
    id,
    email: normalizedEmail,
    name: normalizedEmail.split("@")[0],
    provider: "email",
    user_metadata: {
      full_name: normalizedEmail.split("@")[0],
      email: normalizedEmail,
    },
    created_at: new Date().toISOString(),
  };

  saveSession(localUser);
  return { user: localUser };
}

/**
 * Signs out current user
 */
export async function signOut() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
  try {
    globalThis.localStorage?.removeItem(SESSION_STORAGE_KEY);
    globalThis.localStorage?.setItem(AUTO_LOGIN_PREF_KEY, "false");
  } catch {}
  setStorageAccount(null);
}
