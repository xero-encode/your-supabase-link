import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency } from "@/lib/format";
import {
  featuredTitlesQueryOptions,
  type FeaturedTitle,
} from "@/lib/services/titles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReelTake — Box office returns for indie filmmakers" },
      {
        name: "description",
        content:
          "Review cinema returns statements, apply deal splits, and raise Xero invoices — built for independent filmmakers.",
      },
      { property: "og:title", content: "ReelTake" },
      {
        property: "og:description",
        content:
          "Box office returns, deal splits, and Xero invoicing — built for independent filmmakers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(featuredTitlesQueryOptions),
  component: LandingPage,
  pendingComponent: LandingSkeleton,
  errorComponent: LandingError,
  notFoundComponent: () => <LandingError error={new Error("Not found")} />,
});

function LandingPage() {
  const { data: titles } = useSuspenseQuery(featuredTitlesQueryOptions);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>
        <Hero />
        <FeaturedTitlesSection titles={titles} />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          ReelTake · Box office returns for independent film
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-24 md:pb-24 md:pt-32">
      <p className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        For independent filmmakers
      </p>
      <h1 className="font-serif text-6xl leading-[0.95] tracking-tight text-foreground md:text-8xl">
        Reel<span className="text-accent-red">Take</span>
      </h1>
      <p className="mt-8 max-w-2xl font-serif text-2xl leading-snug text-foreground/80 md:text-3xl">
        Box office returns, deal splits, and Xero invoicing — built for the
        people who put films into cinemas.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-6">
        <Link
          to="/statements"
          className="inline-flex items-center rounded-none bg-primary px-6 py-3 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Review statements →
        </Link>
        <Link
          to="/deals"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Manage deals
        </Link>
      </div>
    </section>
  );
}

function FeaturedTitlesSection({ titles }: { titles: FeaturedTitle[] }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Now showing
            </p>
            <h2 className="mt-2 font-serif text-4xl tracking-tight text-foreground">
              Featured titles
            </h2>
          </div>
          <Link
            to="/statements"
            className="hidden text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:inline"
          >
            All statements →
          </Link>
        </div>

        {titles.length === 0 ? (
          <EmptyState
            title="No titles yet"
            description="Titles appear here as soon as a returns statement is parsed."
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-3">
            {titles.map((t) => (
              <TitleCard key={t.id} title={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TitleCard({ title }: { title: FeaturedTitle }) {
  return (
    <article className="flex flex-col">
      <div className="aspect-[2/3] w-full overflow-hidden border border-border bg-muted">
        {title.poster_url ? (
          <img
            src={title.poster_url}
            alt={`${title.name} poster`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <PosterPlaceholder name={title.name} />
        )}
      </div>
      <h3 className="mt-5 font-serif text-2xl leading-tight tracking-tight text-foreground">
        {title.name}
      </h3>
      <dl className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Total takings
        </dt>
        <dd className="font-sans text-base tabular-nums tracking-tight text-foreground">
          {formatCurrency(title.totalTakings)}
        </dd>
      </dl>
    </article>
  );
}

function PosterPlaceholder({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "·";
  return (
    <div className="flex h-full w-full items-center justify-center bg-secondary">
      <span className="font-serif text-6xl text-muted-foreground/60">
        {initial}
      </span>
    </div>
  );
}

function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-24 md:pb-24 md:pt-32">
        <div className="h-4 w-40 bg-muted" />
        <div className="mt-6 h-24 w-96 max-w-full bg-muted" />
        <div className="mt-8 h-8 w-[32rem] max-w-full bg-muted" />
      </section>
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="h-10 w-64 bg-muted" />
          <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="aspect-[2/3] w-full bg-muted" />
                <div className="mt-5 h-6 w-3/4 bg-muted" />
                <div className="mt-3 h-4 w-1/2 bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function LandingError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => router.invalidate()}
          className="mt-6 inline-flex items-center rounded-none bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
