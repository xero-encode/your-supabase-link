import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { listDeals, type DealWithRefs } from "@/lib/services/deals";
import { listTitles } from "@/lib/services/titles";
import { listVenues } from "@/lib/services/venues";

const dealsQueryOptions = queryOptions({
  queryKey: ["deals", "list"],
  queryFn: listDeals,
});
const titlesQueryOptions = queryOptions({
  queryKey: ["titles"],
  queryFn: listTitles,
});
const venuesQueryOptions = queryOptions({
  queryKey: ["venues"],
  queryFn: listVenues,
});

type StatusFilter = "all" | "active" | "ongoing" | "expired";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Deals — ReelTake" },
      {
        name: "description",
        content:
          "Every revenue-share deal you've agreed with cinemas, grouped by film.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(dealsQueryOptions),
      context.queryClient.ensureQueryData(titlesQueryOptions),
      context.queryClient.ensureQueryData(venuesQueryOptions),
    ]);
  },
  component: DealsPage,
});

function DealsPage() {
  const { data: deals } = useSuspenseQuery(dealsQueryOptions);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (query) {
        const q = query.toLowerCase();
        const hit =
          d.title?.name.toLowerCase().includes(q) ||
          d.venue?.name.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (status === "active") {
        if (d.valid_from > today) return false;
        if (d.valid_to && d.valid_to < today) return false;
      } else if (status === "ongoing") {
        if (d.valid_to !== null) return false;
      } else if (status === "expired") {
        if (!d.valid_to || d.valid_to >= today) return false;
      }
      return true;
    });
  }, [deals, query, status, today]);

  const stats = useMemo(() => {
    const activeCount = deals.filter(
      (d) => d.valid_from <= today && (!d.valid_to || d.valid_to >= today),
    ).length;
    const titles = new Set(deals.map((d) => d.title?.id).filter(Boolean));
    const avg =
      deals.length > 0
        ? deals.reduce((s, d) => s + d.split_percentage, 0) / deals.length
        : 0;
    return { total: deals.length, active: activeCount, titles: titles.size, avg };
  }, [deals, today]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { title: DealWithRefs["title"]; items: DealWithRefs[] }
    >();
    for (const d of filtered) {
      const key = d.title?.id ?? "unknown";
      const existing = map.get(key);
      if (existing) existing.items.push(d);
      else map.set(key, { title: d.title, items: [d] });
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-32 -z-0 h-[280px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-spotlight rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-accent-red) 0%, transparent 70%)",
            opacity: 0.14,
          }}
        />

        <header className="relative mb-10 animate-rise-in">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-1 w-1 animate-reel-tick rounded-full bg-accent-red" />
            The paperwork
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
            Deals
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The split you've agreed with each venue for each film. Deals are
            recorded automatically as statements are parsed.
          </p>
        </header>

        {deals.length === 0 ? (
          <EmptyState
            title="No deals yet"
            description="Deals are added automatically when statements are processed."
          />
        ) : (
          <>
            <StatsStrip stats={stats} />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search film or venue…"
                  className="pl-9"
                />
              </div>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as StatusFilter)}
              >
                <SelectTrigger className="h-10 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All deals</SelectItem>
                  <SelectItem value="active">Active today</SelectItem>
                  <SelectItem value="ongoing">Open-ended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <p className="ml-auto text-xs text-muted-foreground">
                Showing {filtered.length} of {deals.length}
              </p>
            </div>

            {grouped.length === 0 ? (
              <div className="mt-10">
                <EmptyState
                  title="No deals match"
                  description="Try clearing the search or picking a different filter."
                />
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                {grouped.map(({ title, items }, i) => (
                  <TitleDeals
                    key={title?.id ?? "unknown"}
                    title={title}
                    items={items}
                    today={today}
                    index={i}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatsStrip({
  stats,
}: {
  stats: { total: number; active: number; titles: number; avg: number };
}) {
  const items = [
    { label: "Deals on file", value: stats.total.toString() },
    { label: "Active today", value: stats.active.toString() },
    { label: "Films covered", value: stats.titles.toString() },
    { label: "Average split", value: `${stats.avg.toFixed(1)}%` },
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
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TitleDeals({
  title,
  items,
  today,
  index,
}: {
  title: DealWithRefs["title"];
  items: DealWithRefs[];
  today: string;
  index: number;
}) {
  const splits = items.map((d) => d.split_percentage);
  const minSplit = Math.min(...splits);
  const maxSplit = Math.max(...splits);
  const venueCount = new Set(items.map((d) => d.venue?.id ?? "all")).size;
  const activeCount = items.filter(
    (d) => d.valid_from <= today && (!d.valid_to || d.valid_to >= today),
  ).length;

  return (
    <section
      className="group animate-rise-in overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <header className="flex items-center gap-5 border-b border-border bg-secondary/30 px-5 py-4">
        <Poster title={title} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-2xl tracking-tight text-foreground">
            {title?.name ?? "Unknown title"}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {venueCount} {venueCount === 1 ? "venue" : "venues"} ·{" "}
            {activeCount} active
          </p>
        </div>
        <div className="hidden text-right md:block">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Split range
          </p>
          <p className="mt-1 font-serif text-2xl tabular-nums text-foreground">
            {minSplit === maxSplit
              ? `${minSplit}%`
              : `${minSplit}–${maxSplit}%`}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-border">
        {items.map((d, i) => {
          const isActive =
            d.valid_from <= today && (!d.valid_to || d.valid_to >= today);
          const isExpired = d.valid_to !== null && d.valid_to < today;
          return (
            <li
              key={d.id}
              className="animate-rise-in grid grid-cols-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/40 md:grid-cols-[1.4fr_auto_1fr_auto]"
              style={{ animationDelay: `${index * 80 + i * 40 + 100}ms` }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  {d.venue?.name ?? "All venues"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <StatusChip active={isActive} expired={isExpired} />
                </p>
              </div>

              <SplitDial percent={d.split_percentage} />

              <div className="text-xs text-muted-foreground">
                <p className="tabular-nums">
                  <span className="text-foreground">
                    {formatDate(d.valid_from)}
                  </span>{" "}
                  →{" "}
                  <span className="text-foreground">
                    {d.valid_to ? formatDate(d.valid_to) : "ongoing"}
                  </span>
                </p>
                <p className="mt-0.5">
                  {formatDuration(d.valid_from, d.valid_to, today)}
                </p>
              </div>

              <p className="text-right font-serif text-lg tabular-nums text-foreground">
                {d.split_percentage}%
                <span className="ml-1 text-xs text-muted-foreground">
                  to you
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Poster({ title }: { title: DealWithRefs["title"] }) {
  const url = title?.poster_url ? resolvePosterUrl(title.poster_url) : null;
  if (url) {
    return (
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-sm border border-border bg-muted shadow-sm">
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    );
  }
  const initial = title?.name.trim().charAt(0).toUpperCase() ?? "·";
  return (
    <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-sm border border-border bg-secondary font-serif text-xl text-muted-foreground">
      {initial}
    </div>
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

function StatusChip({
  active,
  expired,
}: {
  active: boolean;
  expired: boolean;
}) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent-red">
        <span className="inline-block h-1.5 w-1.5 animate-reel-tick rounded-full bg-accent-red" />
        Active
      </span>
    );
  }
  if (expired) {
    return (
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Expired
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      Scheduled
    </span>
  );
}

function SplitDial({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const size = 44;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  return (
    <div className="relative h-11 w-11">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent-red)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{
            transition: "stroke-dasharray 0.9s cubic-bezier(0.2,0.7,0.2,1)",
          }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium tabular-nums text-foreground">
        {percent}%
      </span>
    </div>
  );
}

function formatDuration(
  from: string,
  to: string | null,
  today: string,
): string {
  const start = new Date(from).getTime();
  const end = new Date(to ?? today).getTime();
  const days = Math.max(1, Math.round((end - start) / 86_400_000));
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 60) {
    const w = Math.round(days / 7);
    return `${w} ${w === 1 ? "week" : "weeks"}`;
  }
  const m = Math.round(days / 30);
  return `${m} ${m === 1 ? "month" : "months"}`;
}
