## Goal

Install the Supabase client and create the minimal integration layer so components, server functions, and (later) edge functions can talk to your existing Supabase project. No schema changes, no UI, no auth pages — just wiring.

## Preflight: confirm the connection actually injected env vars

The connectors listing currently shows no Supabase connection linked to this project, and `fetch_secrets` shows only `LOVABLE_API_KEY`. Before writing any code I'll check whether `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (plus the `VITE_SUPABASE_*` variants) are present.

If they aren't, I'll ask you to add them via `add_secret` (paste the values from your Supabase project → Settings → API). The publishable/anon key and URL are safe to expose as `VITE_*`; the service role key stays server-only.

Required names:
- `SUPABASE_URL` and `VITE_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (server only, never `VITE_`)

## Install

- `bun add @supabase/supabase-js`

## Files to create

All under `src/integrations/supabase/` following the project convention referenced in the workspace knowledge and TanStack Supabase integration docs.

1. `src/integrations/supabase/client.ts` — browser client
   - `createClient<Database>(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)` with `persistSession: true`, `autoRefreshToken: true`, `storage: localStorage`.
   - Used only in components, hooks, event handlers, realtime subscriptions.

2. `src/integrations/supabase/client.server.ts` — service-role admin client
   - `createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` with session persistence off.
   - `.server.ts` extension guarantees the bundler blocks it from client bundles.
   - Used only inside server function handlers via `await import(...)`.

3. `src/integrations/supabase/types.ts` — placeholder typed `Database` interface
   - Empty `public: { Tables: {} … }` shell so both clients are generic-typed today.
   - You'll regenerate it from the live schema with the Supabase CLI in a follow-up (`supabase gen types typescript`) — not part of this setup.

4. `src/integrations/supabase/auth-middleware.ts` — `requireSupabaseAuth`
   - Server function middleware that reads the `Authorization` bearer header, validates the JWT with a publishable-key client via `getUser()`, and puts `{ supabase, userId, claims }` on `context`. Throws 401 when missing/invalid.

5. `src/integrations/supabase/auth-attacher.ts` — `attachSupabaseAuth`
   - Client-side function middleware that calls `supabase.auth.getSession()` and attaches `Authorization: Bearer <token>` to every server function call.

## Files to edit

6. `src/start.ts`
   - Append `attachSupabaseAuth` to `functionMiddleware` (keep the existing `errorMiddleware` in `requestMiddleware`).

## Service layer scaffolding

Per the workspace knowledge ("Route all API calls through a service layer"), I'll create the empty folder skeleton — no functions yet, just the location convention so later features drop in cleanly:

7. `src/lib/services/` — directory with a short `README.md` documenting the convention:
   - `*.functions.ts` files hold `createServerFn` wrappers (client-safe imports only; `client.server` imported inside handlers).
   - `*.server.ts` files hold server-only helpers.
   - Components call these services via `useServerFn` / TanStack Query — never `supabase.from(...)` directly.

## Not doing (explicit)

- No SQL, no migrations, no table/column/policy changes — your schema is authoritative.
- No `_authenticated/` route layout, no `/auth` page, no sign-in UI.
- No edge functions yet — when we add the Make.com invoice call, it will be a Supabase edge function (per your integration rules), created then.
- No routes, no components, no queries.

## Verification

- `bun run build` (or the automatic typecheck) passes.
- `client.server.ts` is not reachable from any route — verified by build output.
- `import { supabase } from "@/integrations/supabase/client"` works from a scratch component (I'll remove the scratch import before finishing).

## Technical notes

- The two-client split (publishable in browser, service role only in `.server.ts`) is what enforces "service role never in browser code" — the bundler fails the build if a client-reachable module imports `client.server`.
- `attachSupabaseAuth` is required now so that the first `requireSupabaseAuth`-guarded server function you add later just works, without touching `start.ts` again.
- The empty `Database` type keeps everything compiling today; regenerating types from your live schema is a one-command follow-up and doesn't change any of these files' shapes.
