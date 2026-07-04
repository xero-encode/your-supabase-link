import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
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

export const Route = createFileRoute("/deals")({
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

  const grouped = new Map<string, { title: DealWithRefs["title"]; items: DealWithRefs[] }>();
  for (const d of deals) {
    const key = d.title?.id ?? "unknown";
    const existing = grouped.get(key);
    if (existing) existing.items.push(d);
    else grouped.set(key, { title: d.title, items: [d] });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl text-foreground">Deals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The split you've agreed with each venue for each film.
          </p>
        </div>

        {deals.length === 0 ? (
          <EmptyState
            title="No deals yet"
            description="Deals are added automatically when statements are processed."
          />
        ) : (
          <div className="space-y-8">
            {[...grouped.values()].map(({ title, items }) => (
              <section
                key={title?.id ?? "unknown"}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <header className="flex items-center gap-4 border-b border-border px-5 py-4">
                  <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                    Reel
                  </div>
                  <h2 className="font-serif text-xl text-foreground">
                    {title?.name ?? "Unknown title"}
                  </h2>
                </header>
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Venue</th>
                      <th className="px-5 py-3 font-medium">Split</th>
                      <th className="px-5 py-3 font-medium">Valid from</th>
                      <th className="px-5 py-3 font-medium">Valid to</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((d) => (
                      <tr key={d.id}>
                        <td className="px-5 py-3">{d.venue?.name ?? "All venues"}</td>
                        <td className="px-5 py-3 tabular-nums">{d.split_percentage}%</td>
                        <td className="px-5 py-3 tabular-nums text-muted-foreground">
                          {formatDate(d.valid_from)}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-muted-foreground">
                          {d.valid_to ? formatDate(d.valid_to) : "ongoing"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

