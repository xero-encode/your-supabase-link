// SERVER ONLY. The `.server.ts` extension prevents this module from being
// bundled into any client chunk. Import it exclusively from inside a
// `createServerFn` `.handler()` body using `await import(...)`, from other
// `*.server.ts` helpers, or from Supabase edge functions.
//
// Never import at the top of a `*.functions.ts` file — the file's top-level
// code ships to the client bundle (only handler bodies are stripped).

import { createClient } from "@supabase/supabase-js";


const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing server Supabase environment variables: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
