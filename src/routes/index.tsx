import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency } from "@/lib/format";
import {
  featuredTitlesQueryOptions,
  type FeaturedTitle,
} from "@/lib/services/titles";
import { performanceQueryOptions } from "@/lib/services/analytics";

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
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredTitlesQueryOptions);
    context.queryClient.prefetchQuery(performanceQueryOptions);
  },
  component: LandingPage,
  pendingComponent: LandingSkeleton,
  errorComponent: LandingError,
  notFoundComponent: () => <LandingError error={new Error("Not found")} />,
});

function LandingPage() {
  const { data: titles } = useSuspenseQuery(featuredTitlesQueryOptions);
  const { data: perf } = useSuspenseQuery(performanceQueryOptions);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <TitleTicker titles={titles} />
      <main>
        <Hero titles={titles} />
        <LiveNumbers
          gross={perf.totalGross}
          share={perf.totalDistributorShare}
          admissions={perf.totalAdmissions}
          statements={perf.statementCount}
          sparkline={perf.byPlayDate}
        />
        <TopVenues venues={perf.byVenue} />
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

function TitleTicker({ titles }: { titles: FeaturedTitle[] }) {
  if (titles.length === 0) return null;
  const line = titles.map((t) => t.name).join("  ✦  ");
  const doubled = `${line}  ✦  ${line}  ✦  `;
  return (
    <div className="relative overflow-hidden border-b border-border bg-foreground text-background">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-foreground to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-foreground to-transparent" />
      <div className="flex items-center gap-3 py-2">
        <span className="ml-4 inline-flex items-center gap-2 whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-background/70">
          <span className="inline-block h-1.5 w-1.5 animate-reel-tick rounded-full bg-accent-red" />
          Now showing
        </span>
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <div className="flex shrink-0 animate-marquee whitespace-nowrap font-serif text-sm tracking-wide">
            <span className="px-4">{doubled}</span>
            <span className="px-4" aria-hidden>
              {doubled}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


function Hero({ titles }: { titles: FeaturedTitle[] }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-40 -z-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 animate-spotlight rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-accent-red) 0%, transparent 60%)",
          opacity: 0.35,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.06),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 md:pt-24">
        <div className="text-center animate-rise-in">
          <p className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span className="inline-block h-1 w-1 animate-reel-tick rounded-full bg-accent-red" />
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
            className="group relative inline-flex items-center overflow-hidden rounded-none bg-primary px-6 py-3 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <span className="relative z-10">Review statements →</span>
            <span className="absolute inset-0 -translate-x-full bg-accent-red/30 transition-transform duration-500 group-hover:translate-x-0" />
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
      </div>
    </section>
  );
}


const ROTATE_MS = 5000;

function PosterStage({ titles }: { titles: FeaturedTitle[] }) {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || titles.length <= 1) return;
    const id = window.setInterval(() => {
      setOffset((o) => o + 1);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, titles.length]);

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

  const pick = (i: number) => titles[((i % titles.length) + titles.length) % titles.length];
  const left = pick(offset - 1);
  const center = pick(offset);
  const right = pick(offset + 1);
  const centerKey = ((offset % titles.length) + titles.length) % titles.length;

  return (
    <div
      className="mt-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex items-end justify-center gap-4 md:gap-8">
        <button
          type="button"
          aria-label="Previous title"
          onClick={() => setOffset((o) => o - 1)}
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground/70 backdrop-blur transition hover:bg-background hover:text-foreground md:left-6"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <PosterCard title={left} scale="side" rotate="-left" />
        <PosterCard title={center} scale="center" transitionKey={centerKey} />
        <PosterCard title={right} scale="side" rotate="-right" />

        <button
          type="button"
          aria-label="Next title"
          onClick={() => setOffset((o) => o + 1)}
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground/70 backdrop-blur transition hover:bg-background hover:text-foreground md:right-6"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {titles.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {titles.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Show ${t.name}`}
              onClick={() => setOffset(i)}
              className={`h-1.5 transition-all ${
                i === centerKey
                  ? "w-8 bg-accent-red"
                  : "w-4 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PosterCard({
  title,
  scale,
  rotate,
  transitionKey,
}: {
  title: FeaturedTitle;
  scale: "center" | "side";
  rotate?: "-left" | "-right";
  transitionKey?: number;
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
        key={transitionKey}
        className={`${width} ${shadow} ${rot} aspect-[2/3] overflow-hidden border border-border bg-muted transition-transform ${isCenter ? "animate-fade-in" : ""}`}
      >
        {title.poster_url ? (
          <img
            src={resolvePosterUrl(title.poster_url)}
            alt={`${title.name} poster`}
            loading="lazy"
            className={`h-full w-full object-cover ${isCenter ? "animate-ken-burns" : ""}`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <PosterPlaceholder name={title.name} />
        )}

      </div>
      {isCenter && (
        <div key={`meta-${transitionKey}`} className="mt-6 max-w-xs animate-fade-in text-center">
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

function LiveNumbers({
  gross,
  share,
  admissions,
  statements,
  sparkline,
}: {
  gross: number;
  share: number;
  admissions: number;
  statements: number;
  sparkline: { play_date: string; gross: number }[];
}) {
  const items = [
    { label: "Gross box office", value: formatCurrency(gross), animate: gross, currency: true },
    { label: "Your share", value: formatCurrency(share), animate: share, currency: true },
    {
      label: "Admissions",
      value: admissions.toLocaleString("en-GB"),
      animate: admissions,
      currency: false,
    },
    {
      label: "Statements",
      value: statements.toLocaleString("en-GB"),
      animate: statements,
      currency: false,
    },
  ];
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Live totals
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-foreground">
              Your slate, right now
            </h2>
          </div>
          <Link
            to="/performance"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Full breakdown →
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {items.map((i, idx) => (
            <div
              key={i.label}
              className="animate-rise-in bg-card px-4 py-5 sm:px-5 sm:py-6"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {i.label}
              </dt>
              <dd className="mt-2 font-serif text-xl tabular-nums tracking-tight text-foreground sm:text-3xl">
                <CountUp
                  target={i.animate}
                  format={(n) =>
                    i.currency
                      ? formatCurrency(n)
                      : Math.round(n).toLocaleString("en-GB")
                  }
                />
              </dd>
            </div>
          ))}
        </dl>
        {sparkline.length > 1 && (
          <div className="mt-6 flex items-center gap-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Daily gross · {sparkline.length} days
            </p>
            <Sparkline points={sparkline.map((p) => p.gross)} />
          </div>
        )}
      </div>
    </section>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 320;
  const h = 44;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const path = coords
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="flex-1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} fill="var(--color-accent-red)" opacity="0.12" />
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent-red)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r="3"
        fill="var(--color-accent-red)"
      />
    </svg>
  );
}

function TopVenues({
  venues,
}: {
  venues: {
    venue_id: string;
    venue_name: string;
    exhibitor_name: string | null;
    gross: number;
    admissions: number;
  }[];
}) {
  if (venues.length === 0) return null;
  const top = venues.slice(0, 5);
  const max = Math.max(...top.map((v) => v.gross), 1);
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Leaderboard
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-foreground">
              Top venues by gross
            </h2>
          </div>
          <Link
            to="/performance"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            All venues →
          </Link>
        </div>
        <ol className="space-y-4">
          {top.map((v, i) => {
            const pct = (v.gross / max) * 100;
            return (
              <li
                key={v.venue_id}
                className="animate-rise-in group grid grid-cols-[2ch_1fr_auto] items-baseline gap-4"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="font-serif text-lg text-accent-red tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="truncate font-serif text-lg text-foreground">
                      {v.venue_name}
                      {v.exhibitor_name && (
                        <span className="ml-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {v.exhibitor_name}
                        </span>
                      )}
                    </p>
                    <p className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                      {v.admissions.toLocaleString("en-GB")} admissions
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden bg-secondary">
                    <div
                      className="bar-fill h-full bg-foreground transition-colors group-hover:bg-accent-red"
                      style={{ width: `${pct}%`, animationDelay: `${i * 90 + 120}ms` }}
                    />
                  </div>
                </div>
                <span className="font-serif text-lg tabular-nums text-foreground">
                  {formatCurrency(v.gross)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}


function CountUp({
  target,
  format,
  duration = 900,
}: {
  target: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{format(value)}</>;
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
