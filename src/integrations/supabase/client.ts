import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read from every place a URL/publishable-key can plausibly live so the module
// never throws at import time — SSR must be able to boot even if the browser
// key isn't wired yet.
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const nodeEnv: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};

const supabaseUrl =
  viteEnv.VITE_SUPABASE_URL ??
  viteEnv.VITE_APP_SUPABASE_URL ??
  nodeEnv.SUPABASE_URL ??
  nodeEnv.PROJECT_SUPABASE_URL ??
  "";

const supabasePublishableKey =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ??
  viteEnv.VITE_SUPABASE_ANON_KEY ??
  viteEnv.VITE_APP_SUPABASE_PUBLISHABLE_KEY ??
  nodeEnv.SUPABASE_PUBLISHABLE_KEY ??
  nodeEnv.SUPABASE_ANON_KEY ??
  "";

function createStub(): SupabaseClient {
  const message =
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or reconnect Lovable Cloud).";
  const handler: ProxyHandler<object> = {
    get() {
      throw new Error(message);
    },
    apply() {
      throw new Error(message);
    },
  };
  return new Proxy({}, handler) as unknown as SupabaseClient;
}

export const supabase: SupabaseClient =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== "undefined" ? window.localStorage : undefined,
        },
      })
    : createStub();
