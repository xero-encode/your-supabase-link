## Landing page at `/`

Replace the current redirect in `src/routes/index.tsx` with a real landing page.

### 1. Service layer addition
Extend `src/lib/services/titles.ts` with `listFeaturedTitlesWithTakings(limit = 3)`:
- Query `titles` ordered by `created_at desc`, limited to 3.
- For each title, aggregate total gross via nested select:
  `titles(id, name, poster_url, created_at, statements!statements_title_id_fkey(box_office_lines(gross_amount)))`
  — but note `statements.title_id` exists per the schema in the knowledge file, so this join is valid. Sum `gross_amount` client-side into `totalTakings: number` (0 when none).
- Return `FeaturedTitle[] = { id, name, poster_url, totalTakings }`.
- If nested statement/lines join proves awkward, do 1 titles query + 1 `box_office_lines` query joined via `statement:statements!inner(title_id)` filtered `in('statement.title_id', ids)` and reduce in JS. Either way, all reads go through the service layer.

### 2. Route: `src/routes/index.tsx`
- Remove the redirect. Use `createFileRoute("/")` with:
  - `head()` — title "ReelTake — Box office returns for indie filmmakers", matching description + og tags.
  - `loader: ({ context }) => context.queryClient.ensureQueryData(featuredTitlesQueryOptions)`
  - `errorComponent`, `notFoundComponent`, `pendingComponent` (subtle skeleton — 3 muted poster placeholders).
  - `component: LandingPage` using `useSuspenseQuery`.

### 3. UI (editorial, Criterion/A24 feel)
- Reuse `AppHeader` for consistent nav.
- **Hero**: generous vertical space on warm off-white. Serif (Fraunces) wordmark "ReelTake" at display size, single ticket-red hairline underline or small mark. Tagline in body sans: "Box office returns, deal splits, and Xero invoicing — built for independent filmmakers." Primary CTA `<Link to="/statements">Review statements →</Link>` styled as ink-black button; secondary text link to `/deals`.
- **Featured titles** section:
  - Small serif eyebrow "Now showing" + h2 "Featured titles".
  - 3-up responsive grid (`grid-cols-1 md:grid-cols-3`) with wide gutters, no card chrome — just poster, title, takings, mirroring a printed film catalogue.
  - Poster: 2:3 aspect ratio (`aspect-[2/3]`), `object-cover`, subtle border. When `poster_url` is null, render a quiet placeholder div (warm muted background, centered serif initial of the title) — never an `<img>` with a broken src.
  - Below poster: film name in serif, then `Total takings` label (uppercase micro caps, muted) and amount via `formatCurrency(totalTakings)` in tabular sans.
- **Empty state**: reuse `EmptyState` — "No titles yet", "Titles appear here as soon as a returns statement is parsed."
- **Loading**: 3 skeleton poster blocks matching the grid.

### 4. Files
- Edit `src/routes/index.tsx` (replace redirect with landing page).
- Edit `src/lib/services/titles.ts` (add featured query).
- No new components required, but a small local `PosterPlaceholder` helper lives inside `index.tsx`.
- No DB changes. No new tables/columns. Read-only.

### Out of scope
- No changes to `/statements`, `/deals`, or edge functions.
- No schema changes; if `statements.title_id` is unexpectedly absent at runtime, fall back to deriving titles via `box_office_lines.deal.title` (already used elsewhere) — same aggregate result.
