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
        <Hero titles={titles} />
        <StatsStrip />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          ReelTake · Box office returns for independent film
        </div>
      </footer>
    </div>
  );
}

function Hero({ titles }: { titles: FeaturedTitle[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
      <div className="text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          For independent filmmakers · Now showing
        </p>
        <h1 className="mx-auto max-w-4xl font-serif text-5xl leading-[0.95] tracking-tight text-foreground md:text-7xl">
          Reel<span className="text-accent-red">Take</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-serif text-xl leading-snug text-foreground/80 md:text-2xl">
          Box office returns, deal splits, and Xero invoicing — built for the
          people who put films into cinemas.
        </p>
      </div>

      <PosterStage titles={titles} />

      <div className="mt-14 flex flex-wrap items-center justify-center gap-6">
        <Link
          to="/statements"
          className="inline-flex items-center rounded-none bg-primary px-6 py-3 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Review statements →
        </Link>
        <Link
          to="/performance"
          className="inline-flex items-center rounded-none border border-foreground/20 bg-transparent px-6 py-3 text-sm font-medium tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          See performance
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

function PosterStage({ titles }: { titles: FeaturedTitle[] }) {
  if (titles.length === 0) {
    return (
      <div className="mt-14">
        <EmptyState
          title="No titles yet"
          description="Films appear here as soon as a returns statement is parsed."
        />
      </div>
    );
  }

  // Choose up to three, feature the middle one.
  const list = titles.slice(0, 3);
  while (list.length < 3) list.push(list[0]);
  const [left, center, right] = list;

  return (
    <div className="relative mt-14 flex items-end justify-center gap-4 md:gap-8">
      <PosterCard title={left} scale="side" rotate="-left" />
      <PosterCard title={center} scale="center" />
      <PosterCard title={right} scale="side" rotate="-right" />
    </div>
  );
}

function PosterCard({
  title,
  scale,
  rotate,
}: {
  title: FeaturedTitle;
  scale: "center" | "side";
  rotate?: "-left" | "-right";
}) {
  const isCenter = scale === "center";
  const width = isCenter ? "w-56 md:w-72" : "w-32 md:w-44";
  const shadow = isCenter
    ? "shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
    : "shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)] opacity-90";
  const rot =
    rotate === "-left"
      ? "-rotate-3 -mr-4 md:-mr-8"
      : rotate === "-right"
        ? "rotate-3 -ml-4 md:-ml-8"
        : "";
  const z = isCenter ? "z-10" : "z-0";

  return (
    <article className={`flex flex-col items-center ${z}`}>
      <div
        className={`${width} ${shadow} ${rot} aspect-[2/3] overflow-hidden border border-border bg-muted transition-transform`}
      >
        {title.poster_url ? (
          <img
            src={resolvePosterUrl(title.poster_url)}
            alt={`${title.name} poster`}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <PosterPlaceholder name={title.name} />
        )}
      </div>
      {isCenter && (
        <div className="mt-6 max-w-xs text-center">
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            {title.name}
          </h2>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Total takings
          </p>
          <p className="mt-1 font-serif text-3xl tabular-nums text-foreground">
            {formatCurrency(title.totalTakings)}
          </p>
        </div>
      )}
    </article>
  );
}

function resolvePosterUrl(url: string): string {
  const blobMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/,
  );
  if (blobMatch) {
    const [, user, repo, rest] = blobMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/${rest}`;
  }
  return url;
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

function StatsStrip() {
  const items = [
    { k: "01", h: "Statements arrive by email", b: "Cinemas send returns straight to your ReelTake address — no uploads." },
    { k: "02", h: "Review before invoicing", b: "Check the parsed figures against the original document in one screen." },
    { k: "03", h: "Invoiced in Xero", b: "One click generates the sales invoice at the right split." },
  ];
  return (
    <section className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px overflow-hidden md:grid-cols-3">
        {items.map((i) => (
          <div key={i.k} className="bg-background px-6 py-10">
            <p className="font-serif text-sm text-accent-red">{i.k}</p>
            <h3 className="mt-3 font-serif text-xl tracking-tight text-foreground">
              {i.h}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{i.b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-24">
        <div className="mx-auto h-4 w-40 bg-muted" />
        <div className="mx-auto mt-6 h-20 w-96 max-w-full bg-muted" />
        <div className="mt-14 flex items-end justify-center gap-8">
          <div className="aspect-[2/3] w-32 bg-muted md:w-44" />
          <div className="aspect-[2/3] w-56 bg-muted md:w-72" />
          <div className="aspect-[2/3] w-32 bg-muted md:w-44" />
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
