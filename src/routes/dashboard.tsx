import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { MoneyCell } from "@/components/MoneyCell";
import { formatCurrency } from "@/lib/format";
import {
  performanceQueryOptions,
  type PerformanceSummary,
} from "@/lib/services/analytics";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ReelTake" },
      {
        name: "description",
        content:
          "At-a-glance box office totals, top films, and daily takings across your slate.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(performanceQueryOptions),
  component: DashboardPage,
  errorComponent: DashboardError,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(performanceQueryOptions);
  const hasData = data.totalGross > 0 || data.byPlayDate.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Overview
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground">
              Dashboard
            </h1>
          </div>
          <Link
            to="/performance"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Full breakdown →
          </Link>
        </header>

        {!hasData ? (
          <EmptyState
            title="Nothing to show yet"
            description="Once statements are reviewed, your daily takings will appear here."
          />
        ) : (
          <div className="space-y-12">
            <SummaryBar data={data} />
            <PlayDateTimeline data={data} />
            <TopFilms data={data} />
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryBar({ data }: { data: PerformanceSummary }) {
  const items = [
    { label: "Gross box office", value: formatCurrency(data.totalGross) },
    { label: "Your share", value: formatCurrency(data.totalDistributorShare) },
    {
      label: "Admissions",
      value: data.totalAdmissions.toLocaleString("en-GB"),
    },
    {
      label: "Statements",
      value: data.statementCount.toLocaleString("en-GB"),
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-card px-5 py-6">
          <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {i.label}
          </dt>
          <dd className="mt-2 font-serif text-3xl tabular-nums tracking-tight text-foreground">
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PlayDateTimeline({ data }: { data: PerformanceSummary }) {
  const max = Math.max(...data.byPlayDate.map((d) => d.gross), 1);
  const dates = data.byPlayDate.slice(-30);

  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          By play date
        </p>
        <h2 className="mt-1 font-serif text-2xl tracking-tight text-foreground">
          Daily takings
        </h2>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex h-48 items-end gap-1">
          {dates.map((d) => (
            <div
              key={d.play_date}
              className="group relative flex-1"
              title={`${d.play_date} · ${formatCurrency(d.gross)}`}
            >
              <div
                className="w-full bg-accent-red/80 transition-colors group-hover:bg-accent-red"
                style={{ height: `${(d.gross / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{dates[0]?.play_date ?? ""}</span>
          <span>{dates[dates.length - 1]?.play_date ?? ""}</span>
        </div>
      </div>
    </section>
  );
}

function TopFilms({ data }: { data: PerformanceSummary }) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Top performers
        </p>
        <h2 className="mt-1 font-serif text-2xl tracking-tight text-foreground">
          Films
        </h2>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {data.byTitle.slice(0, 5).map((t) => (
          <li
            key={t.title_id}
            className="flex items-baseline justify-between px-5 py-4"
          >
            <span className="font-serif text-base text-foreground">
              {t.title_name}
            </span>
            <div className="text-right">
              <MoneyCell amount={t.gross} className="text-sm" />
              <p className="text-xs text-muted-foreground">
                Your share <MoneyCell amount={t.distributorShare} className="text-xs" />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DashboardError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl tracking-tight text-foreground">
          Dashboard didn't load
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
