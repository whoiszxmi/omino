import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createFallbackClient(): SupabaseClient {
  return createSupabaseClient("https://placeholder.supabase.co", "placeholder-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Supabase env vars ausentes. Usando client fallback para build/local.");
    }
    return createFallbackClient();
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
