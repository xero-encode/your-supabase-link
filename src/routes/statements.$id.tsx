import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  getStatement,
  markStatementReviewed,
  type StatementDetail,
} from "@/lib/services/statements";

import { StatusChip } from "@/components/StatusChip";
import { MoneyCell } from "@/components/MoneyCell";
import { Button } from "@/components/ui/button";
import { formatDate, formatPeriod } from "@/lib/format";
import { distributorShare, statementTotals } from "@/lib/split";

const statementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["statements", "detail", id],
    queryFn: () => getStatement(id),
  });

export const Route = createFileRoute("/statements/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(statementQueryOptions(params.id)),
  component: StatementReview,
  notFoundComponent: () => (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <h1 className="font-serif text-2xl">Statement not found</h1>
    </div>
  ),
});

function StatementReview() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(statementQueryOptions(id));

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <h1 className="font-serif text-2xl">Statement not found</h1>
      </div>
    );
  }

  return <ReviewInner statement={data} />;
}

function ReviewInner({ statement }: { statement: StatementDetail }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [invoicing, setInvoicing] = useState(false);

  const totals = statementTotals(statement.box_office_lines);
  const canConfirm =
    totals.linesMissingDeal === 0 &&
    (statement.status === "uploaded" || statement.status === "parsed");

  const confirm = useMutation({
    mutationFn: () => markStatementReviewed(statement.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["statements"] });
      await router.invalidate();
      toast.success("Figures confirmed");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function createInvoice() {
    if (invoicing) return;
    setInvoicing(true);
    try {
      const exhibitorName = statement.exhibitor?.name ?? "Exhibitor";
      const periodLabel = formatPeriod(statement.period_start, statement.period_end);
      const invoiceName = `${exhibitorName} — Playweek ${periodLabel}`;
      const invoiceReference = `${exhibitorName} ${periodLabel}`.replace(/\s+/g, " ").trim();

      const response = await fetch(
        "https://hook.eu1.make.com/xcuc680s57qljrtlqgwd71c7y5hesh5t",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            statement_id: statement.id,
            invoice_name: invoiceName,
            invoice_reference: invoiceReference,
            exhibitor_name: exhibitorName,
            period_start: statement.period_start,
            period_end: statement.period_end,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to trigger invoice generation");
      toast.success("Invoice generation triggered in Xero");
      await queryClient.invalidateQueries({ queryKey: ["statements"] });
      await router.invalidate();
    } catch (e) {
      toast.error(
        `Couldn't create invoice: ${(e as Error).message}. The statement is still ready to retry.`,
      );
    } finally {
      setInvoicing(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl leading-tight text-foreground">
              {statement.title?.name ?? "Untitled"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {statement.exhibitor?.name ?? "Unknown exhibitor"} ·{" "}
              <span className="tabular-nums">
                {formatPeriod(statement.period_start, statement.period_end)}
              </span>
            </p>
          </div>
          <StatusChip status={statement.status} />
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat label="Total gross" value={<MoneyCell amount={totals.totalGross} />} />
        <SummaryStat
          label="Owed to distributor"
          value={<MoneyCell amount={totals.totalOwed} />}
        />
        <SummaryStat
          label="Lines needing a deal"
          value={
            <span
              className={
                totals.linesMissingDeal > 0
                  ? "text-accent-red tabular-nums"
                  : "tabular-nums"
              }
            >
              {totals.linesMissingDeal}
            </span>
          }
        />
      </div>

      {/* Lines table */}
      {statement.box_office_lines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-serif text-lg">No box office lines yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The parser hasn't produced any lines for this statement.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Play date</th>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium">Screen</th>
                <th className="px-4 py-3 font-medium">Ticket type</th>
                <th className="px-4 py-3 text-right font-medium">Admissions</th>
                <th className="px-4 py-3 text-right font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Split</th>
                <th className="px-4 py-3 text-right font-medium">Distributor share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {statement.box_office_lines.map((line) => {
                const share = line.deal
                  ? distributorShare(line.gross_amount, line.deal.split_percentage)
                  : null;
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {formatDate(line.play_date)}
                    </td>
                    <td className="px-4 py-3">{line.deal?.venue?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{line.screen ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{line.ticket_type ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {line.admissions ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyCell amount={line.gross_amount} />
                    </td>
                    <td className="px-4 py-3">
                      {line.deal ? (
                        <span className="tabular-nums text-foreground">
                          {line.deal.split_percentage}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-accent-red/30 bg-accent-red/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-accent-red">
                          Needs deal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {share !== null ? <MoneyCell amount={share} /> : <MoneyCell amount={null} muted />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {statement.status !== "reviewed" &&
          statement.status !== "invoiced" && (
            <>
              <Button
                onClick={() => confirm.mutate()}
                disabled={!canConfirm || confirm.isPending}
              >
                {confirm.isPending ? "Confirming…" : "Confirm figures"}
              </Button>
              {!canConfirm && totals.linesMissingDeal > 0 && (
                <p className="text-sm text-muted-foreground">
                  Add a deal for every line before confirming.
                </p>
              )}
            </>
          )}

        {statement.status === "reviewed" && (
          <Button
            onClick={createInvoice}
            disabled={invoicing}
            className="bg-accent-red text-primary-foreground hover:bg-accent-red/90"
          >
            {invoicing ? "Sending to Xero…" : "Create invoice in Xero"}
          </Button>
        )}

        {statement.status === "invoiced" && (
          <p className="text-sm text-muted-foreground">
            Invoice already raised for this statement.
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}
