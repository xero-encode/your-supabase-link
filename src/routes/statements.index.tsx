import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

import {
  listStatementsWithTotals,
  type StatementListItem,
} from "@/lib/services/statements";
import { StatusChip } from "@/components/StatusChip";
import { MoneyCell } from "@/components/MoneyCell";
import { EmptyState } from "@/components/EmptyState";
import { formatPeriod } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FILTERS = ["all", "needs-review", "invoiced", "paid"] as const;
type Filter = (typeof FILTERS)[number];

const searchSchema = z.object({
  status: z.enum(FILTERS).catch("all").default("all"),
});

const statementsQueryOptions = queryOptions({
  queryKey: ["statements", "list"],
  queryFn: listStatementsWithTotals,
});

export const Route = createFileRoute("/statements/")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(statementsQueryOptions),
  component: StatementsList,
});

// A statement is considered "paid" when its invoice has been marked PAID in Xero.
function displayStatus(s: StatementListItem): string {
  if (s.status === "invoiced" && s.invoiceStatus?.toUpperCase() === "PAID") return "paid";
  return s.status;
}

function matches(filter: Filter, s: StatementListItem): boolean {
  const status = displayStatus(s);
  if (filter === "all") return true;
  if (filter === "needs-review")
    return status === "uploaded" || status === "parsed" || status === "reviewed";
  return status === filter;
}

const GROUP_ORDER = ["parsed", "uploaded", "reviewed", "invoiced", "paid"];
const GROUP_LABEL: Record<string, string> = {
  parsed: "Needs review",
  uploaded: "Just arrived",
  reviewed: "Ready to invoice",
  invoiced: "Invoiced",
  paid: "Paid",
};

function StatementsList() {
  const { data } = useSuspenseQuery(statementsQueryOptions);
  const { status } = Route.useSearch();
  const navigate = useNavigate();

  const filtered = data.filter((s) => matches(status, s));
  const grouped = new Map<string, StatementListItem[]>();
  for (const s of filtered) {
    const key = displayStatus(s);
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl text-foreground">Statements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cinema returns as they arrive. Review the figures, then raise the
            invoice.
          </p>
        </div>
      </div>

      <Tabs
        value={status}
        onValueChange={(v) =>
          navigate({
            to: "/statements",
            search: { status: v as Filter },
          })
        }
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="needs-review">Needs review</TabsTrigger>
          <TabsTrigger value="invoiced">Invoiced</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          title="No statements yet"
          description="They'll appear here as cinemas email them in."
        />
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => (
            <section key={group}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {GROUP_LABEL[group] ?? group}
              </h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Exhibitor</th>
                      <th className="px-4 py-3 font-medium">Playweek</th>
                      <th className="px-4 py-3 text-right font-medium">Admissions</th>
                      <th className="px-4 py-3 text-right font-medium">Gross</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(grouped.get(group) ?? []).map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <Link
                            to="/statements/$id"
                            params={{ id: s.id }}
                            className="font-serif text-base text-foreground hover:underline"
                          >
                            {s.exhibitor?.name ?? "Unknown exhibitor"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {formatPeriod(s.period_start, s.period_end)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {s.totalAdmissions.toLocaleString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MoneyCell amount={s.totalGross} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={displayStatus(s)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
