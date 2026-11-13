import { supabase as clientProxy } from '@/integrations/supabase/client';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL);

const supabaseKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured ? clientProxy : null;