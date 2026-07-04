## Fix SSR crash: Supabase client has no env vars

### Diagnosis
`src/integrations/supabase/client.ts` throws `Missing Supabase environment variables: set VITE_APP_SUPABASE_URL and VITE_APP_SUPABASE_PUBLISHABLE_KEY` at module init. It's imported (transitively via `attachSupabaseAuth`) from `src/start.ts`, so SSR crashes for every route. Lovable Cloud has provisioned `PROJECT_SUPABASE_URL` and `APP_SUPABASE_SERVICE_ROLE_KEY` but no publishable/anon key, and there is no `.env`.

### Fix (two parts)

**1. Repoint the browser client at the standard env-var names, with SSR fallbacks.**
Edit `src/integrations/supabase/client.ts` to:
- Read `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` first (standard Lovable Cloud names), then fall back to legacy `VITE_APP_*`, then in SSR to `process.env.SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `PROJECT_SUPABASE_URL`.
- Keep the existing `localStorage`-guarded auth config unchanged.
- Only throw at *use* time if still missing, not at module import — so an unconfigured project no longer blanks the whole app during SSR.

**2. Supply the publishable/anon key.**
The client key is not in the sandbox. Two options — pick one:
- **(a) Reconnect Lovable Cloud** so it injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` automatically. Preferred; nothing to paste.
- **(b) Paste the anon/publishable key** from the Supabase project's API settings; I'll store it as `VITE_SUPABASE_PUBLISHABLE_KEY` (and `SUPABASE_PUBLISHABLE_KEY` for SSR) via the secrets tool and set `VITE_SUPABASE_URL` to match `PROJECT_SUPABASE_URL`.

### Not changing
- Landing page code (`src/routes/index.tsx`, `src/lib/services/titles.ts`) — those are fine; they'll render as soon as the client can boot.
- Database, RLS, service layer, `start.ts` middleware wiring.

### Verification
After the client edit + key set: hit `/` and confirm the hero renders and the three featured titles load with formatted takings; check dev-server logs for zero SSR errors.
