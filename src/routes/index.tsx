import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
      <main>
        <Hero titles={titles} />
        <LiveNumbers
          gross={perf.totalGross}
          share={perf.totalDistributorShare}
          admissions={perf.totalAdmissions}
          statements={perf.statementCount}
        />
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

  const list = titles.slice(0, 3);
  while (list.length < 3) list.push(list[0]);
  const [left, center, right] = list;

  return (
    <div>
      <div className="relative mt-14 flex items-end justify-center gap-4 md:gap-8">
        <PosterCard title={left} scale="side" defaultRotation={-6} />
        <PosterCard title={center} scale="center" defaultRotation={0} />
        <PosterCard title={right} scale="side" defaultRotation={6} />
      </div>
      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Drag a poster to rotate · double-click to reset
      </p>
    </div>
  );
}

function PosterCard({
  title,
  scale,
  defaultRotation,
}: {
  title: FeaturedTitle;
  scale: "center" | "side";
  defaultRotation: number;
}) {
  const isCenter = scale === "center";
  const width = isCenter ? "w-56 md:w-72" : "w-32 md:w-44";
  const shadow = isCenter
    ? "shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
    : "shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)] opacity-95";
  const offset = isCenter
    ? ""
    : defaultRotation < 0
      ? "-mr-4 md:-mr-8"
      : "-ml-4 md:-ml-8";
  const z = isCenter ? "z-10" : "z-0";

  const [rotation, setRotation] = useState(defaultRotation);
  const [dragging, setDragging] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startAngle: number; startRot: number } | null>(
    null,
  );

  const angleFromCenter = (clientX: number, clientY: number) => {
    const el = posterRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return (
      (Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) *
        180) /
      Math.PI
    );
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      startAngle: angleFromCenter(e.clientX, e.clientY),
      startRot: rotation,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const current = angleFromCenter(e.clientX, e.clientY);
    const delta = current - dragState.current.startAngle;
    setRotation(dragState.current.startRot + delta);
  };

  const endDrag = () => {
    dragState.current = null;
    setDragging(false);
  };

  return (
    <article className={`flex flex-col items-center ${z} ${offset}`}>
      <div
        ref={posterRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => setRotation(defaultRotation)}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: dragging ? "none" : "transform 300ms ease-out",
          touchAction: "none",
        }}
        className={`${width} ${shadow} aspect-[2/3] cursor-grab touch-none select-none overflow-hidden border border-border bg-muted active:cursor-grabbing`}
      >
        {title.poster_url ? (
          <img
            src={resolvePosterUrl(title.poster_url)}
            alt={`${title.name} poster`}
            loading="lazy"
            draggable={false}
            className="pointer-events-none h-full w-full object-cover"
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

function LiveNumbers({
  gross,
  share,
  admissions,
  statements,
}: {
  gross: number;
  share: number;
  admissions: number;
  statements: number;
}) {
  const items = [
    { label: "Gross box office", value: formatCurrency(gross), animate: gross },
    { label: "Your share", value: formatCurrency(share), animate: share },
    {
      label: "Admissions",
      value: admissions.toLocaleString("en-GB"),
      animate: admissions,
    },
    {
      label: "Statements",
      value: statements.toLocaleString("en-GB"),
      animate: statements,
    },
  ];
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8 flex items-baseline justify-between">
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
          {items.map((i) => (
            <div key={i.label} className="bg-card px-5 py-6">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {i.label}
              </dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums tracking-tight text-foreground">
                <CountUp target={i.animate} format={(n) => renderMatching(i.value, n)} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// Keeps formatted output shape (currency vs plain) but interpolates numeric value.
function renderMatching(finalString: string, n: number) {
  if (finalString.startsWith("£")) return formatCurrency(n);
  return Math.round(n).toLocaleString("en-GB");
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
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
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
