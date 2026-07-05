# ReelTake

Box office revenue management for independent filmmakers and micro-distributors.

ReelTake helps UK indie producers track ticket sales, apply revenue splits, and raise invoices — without needing to be an accountant.

## What it does

- **Ingests returns statements** — Cinemas email weekly box office reports; they are parsed automatically and stored ready for review.
- **Review and confirm** — Compare the original document side-by-side with extracted figures, spot parsing errors, and mark statements ready for invoicing.
- **Apply revenue splits** — Deals (splits) are matched to each line automatically by venue and date range. The app calculates what is owed to you.
- **Raise invoices** — Generate sales invoices in Xero directly from a reviewed statement.
- **Track performance** — Dashboards show per-film P&L, daily takings, and unpaid invoices by exhibitor.

## Stack

- **Frontend:** React 19 + TypeScript + TanStack Start + Tailwind CSS + shadcn/ui
- **State:** TanStack Query (server), Zustand (client)
- **Backend:** Lovable Cloud (PostgreSQL, Auth, Storage)
- **Integrations:** Xero (invoicing), Make.com (email ingestion and parsing)

## Development

```bash
bun install
bun run dev
```

```bash
bun run build
```

```bash
bun run lint
```

## Project structure

```
src/
  routes/           # TanStack Start file-based routes
  components/       # Shared React components
  lib/
    services/       # Data access layer (Supabase via server functions)
    utils/          # Formatting, calculations, helpers
  integrations/     # Supabase client and auth wiring
```

## Domain notes

- **Title** — the film showing at the cinema.
- **Exhibitor** — the cinema business (chain or independent).
- **Venue** — a physical cinema site.
- **Statement** — a weekly returns document from an exhibitor.
- **Deal** — the split percentage valid for a film at a venue over a date range.
- **Box office line** — a single day's takings for a film at a venue.

## License

Private — all rights reserved.
