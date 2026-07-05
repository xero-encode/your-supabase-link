import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";


import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { MoneyCell } from "@/components/MoneyCell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  performanceQueryOptions,
  type PerformanceSummary,
  type PlayDateDetail,
} from "@/lib/services/analytics";

type Metric = "gross" | "distributorShare" | "admissions";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance — ReelTake" },
      {
        name: "description",
        content:
          "Box office performance broken down by title, deal, venue, and ticket type.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(performanceQueryOptions),
  component: PerformancePage,
  errorComponent: PerformanceError,
  notFoundComponent: () => <PerformanceError error={new Error("Not found")} />,
});

function PerformancePage() {
  const { data } = useSuspenseQuery(performanceQueryOptions);
  const hasData = data.totalGross > 0 || data.byTitle.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[360px] w-[520px] -translate-x-1/2 animate-spotlight rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-accent-red) 0%, transparent 60%)",
            opacity: 0.22,
          }}
        />
        <header className="relative mb-10 animate-rise-in">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-1 w-1 animate-reel-tick rounded-full bg-accent-red" />
            Box office
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
            Performance
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            How your films are doing — by title, deal, venue, and ticket type.
            All figures are pulled from reviewed statements.
          </p>
        </header>

        {!hasData ? (
          <EmptyState
            title="No box office yet"
            description="Performance shows up here once statements land and get reviewed."
          />
        ) : (
          <>
            <SummaryBar data={data} />
            <div className="mt-12 space-y-12">
              <PlayDateBreakdown data={data} />
              <TitleBreakdown data={data} />
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                <VenueBreakdown data={data} />
                <TicketTypeBreakdown data={data} />
              </div>
              <DealBreakdown data={data} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryBar({ data }: { data: PerformanceSummary }) {
  const items = [
    { label: "Gross box office", animate: data.totalGross, currency: true },
    { label: "Your share", animate: data.totalDistributorShare, currency: true },
    { label: "Admissions", animate: data.totalAdmissions, currency: false },
    { label: "Statements", animate: data.statementCount, currency: false },
  ];
  return (
    <dl className="relative grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
      {items.map((i, idx) => (
        <div
          key={i.label}
          className="animate-rise-in bg-card px-5 py-6"
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {i.label}
          </dt>
          <dd className="mt-2 font-serif text-3xl tabular-nums tracking-tight text-foreground">
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


function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-serif text-2xl tracking-tight text-foreground">
        {title}
      </h2>
    </div>
  );
}

function PlayDateBreakdown({ data }: { data: PerformanceSummary }) {
  const [titleId, setTitleId] = useState<string>("all");
  const [venueId, setVenueId] = useState<string>("all");
  const [metric, setMetric] = useState<Metric>("gross");

  const filtered: PlayDateDetail[] = useMemo(
    () =>
      data.playDateDetail.filter(
        (d) =>
          (titleId === "all" || d.title_id === titleId) &&
          (venueId === "all" || d.venue_id === venueId),
      ),
    [data.playDateDetail, titleId, venueId],
  );

  const rows = useMemo(() => {
    const map = new Map<string, { play_date: string; value: number; admissions: number; gross: number }>();
    for (const d of filtered) {
      const cur = map.get(d.play_date) ?? {
        play_date: d.play_date,
        value: 0,
        admissions: 0,
        gross: 0,
      };
      cur.value +=
        metric === "gross"
          ? d.gross
          : metric === "distributorShare"
            ? d.distributorShare
            : d.admissions;
      cur.admissions += d.admissions;
      cur.gross += d.gross;
      map.set(d.play_date, cur);
    }
    return [...map.values()].sort((a, b) =>
      a.play_date.localeCompare(b.play_date),
    );
  }, [filtered, metric]);

  const max = Math.max(...rows.map((d) => d.value), 1);
  const total = rows.reduce((s, d) => s + d.value, 0);
  const formatValue = (v: number) =>
    metric === "admissions" ? v.toLocaleString("en-GB") : formatCurrency(v);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            By play date
          </p>
          <h2 className="mt-1 font-serif text-2xl tracking-tight text-foreground">
            Daily takings
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={titleId} onValueChange={setTitleId}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue placeholder="Title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All titles</SelectItem>
              {data.byTitle.map((t) => (
                <SelectItem key={t.title_id} value={t.title_id}>
                  {t.title_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={venueId} onValueChange={setVenueId}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue placeholder="Venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All venues</SelectItem>
              {data.byVenue.map((v) => (
                <SelectItem key={v.venue_id} value={v.venue_id}>
                  {v.venue_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gross">Gross box office</SelectItem>
              <SelectItem value="distributorShare">Your share</SelectItem>
              <SelectItem value="admissions">Admissions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No play dates match these filters.
          </p>
        ) : (
          <>
            <div className="flex h-40 items-end gap-1">
              {rows.map((d, i) => (
                <div
                  key={d.play_date}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                  title={`${d.play_date} · ${formatValue(d.value)}`}
                >
                  <span className="mb-1 text-center text-[8px] leading-none text-muted-foreground">
                    {formatValue(d.value)}
                  </span>
                  <div
                    className="bar-fill-y w-full bg-accent-red/80 transition-colors group-hover:bg-accent-red"
                    style={{
                      height: `${Math.max((d.value / max) * 100, 2)}%`,
                      animationDelay: `${Math.min(i * 12, 400)}ms`,
                    }}
                  />

                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{rows[0].play_date}</span>
              <span>
                {formatValue(total)} across {rows.length}{" "}
                {rows.length === 1 ? "day" : "days"}
              </span>
              <span>{rows[rows.length - 1].play_date}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function TitleBreakdown({ data }: { data: PerformanceSummary }) {
  const max = Math.max(...data.byTitle.map((t) => t.gross), 1);
  return (
    <section>
      <SectionHeader eyebrow="By title" title="Films" />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Admissions</th>
              <th className="px-5 py-3 font-medium">Gross</th>
              <th className="px-5 py-3 font-medium">Your share</th>
              <th className="px-5 py-3 font-medium">Split of gross</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.byTitle.map((t, i) => (
              <tr
                key={t.title_id}
                className="animate-rise-in transition-colors hover:bg-secondary/30"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <td className="px-5 py-3 font-serif text-base text-foreground">
                  {t.title_name}
                </td>
                <td className="px-5 py-3 tabular-nums text-muted-foreground">
                  {t.admissions.toLocaleString("en-GB")}
                </td>
                <td className="px-5 py-3">
                  <MoneyCell amount={t.gross} />
                </td>
                <td className="px-5 py-3">
                  <MoneyCell amount={t.distributorShare} />
                </td>
                <td className="px-5 py-3">
                  <div className="h-1.5 w-full overflow-hidden bg-muted">
                    <div
                      className="bar-fill h-full bg-accent-red"
                      style={{
                        width: `${(t.gross / max) * 100}%`,
                        animationDelay: `${i * 60 + 120}ms`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VenueBreakdown({ data }: { data: PerformanceSummary }) {
  return (
    <section>
      <SectionHeader eyebrow="By venue" title="Cinemas" />
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {data.byVenue.slice(0, 10).map((v, i) => (
          <li
            key={v.venue_id}
            className="animate-rise-in flex items-baseline justify-between px-5 py-3 transition-colors hover:bg-secondary/30"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div>
              <p className="text-sm text-foreground">{v.venue_name}</p>
              {v.exhibitor_name && (
                <p className="text-xs text-muted-foreground">
                  {v.exhibitor_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <MoneyCell amount={v.gross} className="text-sm" />
              <p className="text-xs text-muted-foreground">
                {v.admissions.toLocaleString("en-GB")} admissions
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TicketTypeBreakdown({ data }: { data: PerformanceSummary }) {
  return (
    <section>
      <SectionHeader eyebrow="By ticket type" title="Ticket mix" />
      <ul className="space-y-3 rounded-lg border border-border bg-card p-5">
        {data.byTicketType.map((t, i) => (
          <li
            key={t.ticket_type}
            className="animate-rise-in"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-foreground">{t.ticket_type}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatCurrency(t.gross)} · {t.share.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-muted">
              <div
                className="bar-fill h-full bg-foreground"
                style={{
                  width: `${t.share}%`,
                  animationDelay: `${i * 70 + 120}ms`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>

  );
}

function DealBreakdown({ data }: { data: PerformanceSummary }) {
  return (
    <section>
      <SectionHeader eyebrow="By deal" title="Deals" />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Venue</th>
              <th className="px-5 py-3 font-medium">Split</th>
              <th className="px-5 py-3 font-medium">Gross</th>
              <th className="px-5 py-3 font-medium">Your share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.byDeal.map((d) => (
              <tr key={d.deal_id}>
                <td className="px-5 py-3 text-foreground">{d.title_name}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {d.venue_name ?? "All venues"}
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {d.split_percentage}%
                </td>
                <td className="px-5 py-3">
                  <MoneyCell amount={d.gross} />
                </td>
                <td className="px-5 py-3">
                  <MoneyCell amount={d.distributorShare} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PerformanceError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl tracking-tight text-foreground">
          Performance didn't load
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
