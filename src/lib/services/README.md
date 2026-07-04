# Service layer

All Supabase data access lives here. Components, hooks, and route loaders
MUST call these services (via `useServerFn` + TanStack Query) rather than
importing `supabase` directly.

## File conventions

- `*.functions.ts` — `createServerFn` wrappers. Client-safe imports only at
  the top of the file. Import `@/integrations/supabase/client.server`
  ONLY inside a `.handler()` body with `await import(...)`.
- `*.server.ts` — server-only helpers (pure DB / secret work). The
  `.server.ts` extension is enforced by the bundler and blocks client
  imports.
- Public read-only server fns create a publishable-key client inside the
  handler; user-scoped server fns use `.middleware([requireSupabaseAuth])`.

## Not allowed

- `supabase.from(...)` inside a React component or route file.
- Top-level `import { supabaseAdmin } from "@/integrations/supabase/client.server"`
  in a `.functions.ts` file — service role would leak into the client
  bundle.
- Direct `fetch()` calls to Supabase REST/Storage from components.
