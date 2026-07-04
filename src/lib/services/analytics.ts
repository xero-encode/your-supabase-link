import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export interface TitlePerformance {
  title_id: string;
  title_name: string;
  poster_url: string | null;
  admissions: number;
  gross: number;
  distributorShare: number;
  lineCount: number;
}

export interface VenuePerformance {
  venue_id: string;
  venue_name: string;
  exhibitor_name: string | null;
  admissions: number;
  gross: number;
  distributorShare: number;
}

export interface DealPerformance {
  deal_id: string;
  title_name: string;
  venue_name: string | null;
  split_percentage: number;
  admissions: number;
  gross: number;
  distributorShare: number;
}

export interface TicketTypePerformance {
  ticket_type: string;
  admissions: number;
  gross: number;
  distributorShare: number;
  share: number; // % of total gross
}

export interface PerformanceSummary {
  totalAdmissions: number;
  totalGross: number;
  totalDistributorShare: number;
  statementCount: number;
  byTitle: TitlePerformance[];
  byVenue: VenuePerformance[];
  byDeal: DealPerformance[];
  byTicketType: TicketTypePerformance[];
}

interface LineRow {
  id: string;
  admissions: number | null;
  gross_amount: number | null;
  ticket_type: string | null;
  statement_id: string;
  deal: {
    id: string;
    split_percentage: number;
    title: { id: string; name: string; poster_url: string | null } | null;
    venue: {
      id: string;
      name: string;
      exhibitor: { name: string | null } | null;
    } | null;
  } | null;
}

export async function loadPerformance(): Promise<PerformanceSummary> {
  const { data, error } = await supabase
    .from("box_office_lines")
    .select(
      `id, admissions, gross_amount, ticket_type, statement_id,
       deal:deals(id, split_percentage,
         title:titles(id, name, poster_url),
         venue:venues(id, name, exhibitor:exhibitors(name)))`,
    );
  if (error) throw error;

  const rows = (data ?? []) as unknown as LineRow[];

  const titles = new Map<string, TitlePerformance>();
  const venues = new Map<string, VenuePerformance>();
  const deals = new Map<string, DealPerformance>();
  const tickets = new Map<string, TicketTypePerformance>();
  const statementIds = new Set<string>();

  let totalAdmissions = 0;
  let totalGross = 0;
  let totalShare = 0;

  for (const row of rows) {
    const adm = row.admissions ?? 0;
    const gross = row.gross_amount ?? 0;
    const splitPct = row.deal?.split_percentage ?? 0;
    const share = Math.round(gross * splitPct) / 100;

    totalAdmissions += adm;
    totalGross += gross;
    totalShare += share;
    statementIds.add(row.statement_id);

    const title = row.deal?.title;
    if (title) {
      const t = titles.get(title.id) ?? {
        title_id: title.id,
        title_name: title.name,
        poster_url: title.poster_url,
        admissions: 0,
        gross: 0,
        distributorShare: 0,
        lineCount: 0,
      };
      t.admissions += adm;
      t.gross += gross;
      t.distributorShare += share;
      t.lineCount += 1;
      titles.set(title.id, t);
    }

    const v = row.deal?.venue;
    if (v) {
      const e = venues.get(v.id) ?? {
        venue_id: v.id,
        venue_name: v.name,
        exhibitor_name: v.exhibitor?.name ?? null,
        admissions: 0,
        gross: 0,
        distributorShare: 0,
      };
      e.admissions += adm;
      e.gross += gross;
      e.distributorShare += share;
      venues.set(v.id, e);
    }

    if (row.deal && row.deal.title) {
      const d = deals.get(row.deal.id) ?? {
        deal_id: row.deal.id,
        title_name: row.deal.title.name,
        venue_name: row.deal.venue?.name ?? null,
        split_percentage: row.deal.split_percentage,
        admissions: 0,
        gross: 0,
        distributorShare: 0,
      };
      d.admissions += adm;
      d.gross += gross;
      d.distributorShare += share;
      deals.set(row.deal.id, d);
    }

    const tt = (row.ticket_type ?? "Unspecified").trim() || "Unspecified";
    const tk = tickets.get(tt) ?? {
      ticket_type: tt,
      admissions: 0,
      gross: 0,
      distributorShare: 0,
      share: 0,
    };
    tk.admissions += adm;
    tk.gross += gross;
    tk.distributorShare += share;
    tickets.set(tt, tk);
  }

  const byTicketType = [...tickets.values()]
    .map((t) => ({
      ...t,
      share: totalGross > 0 ? (t.gross / totalGross) * 100 : 0,
    }))
    .sort((a, b) => b.gross - a.gross);

  return {
    totalAdmissions,
    totalGross,
    totalDistributorShare: totalShare,
    statementCount: statementIds.size,
    byTitle: [...titles.values()].sort((a, b) => b.gross - a.gross),
    byVenue: [...venues.values()].sort((a, b) => b.gross - a.gross),
    byDeal: [...deals.values()].sort((a, b) => b.gross - a.gross),
    byTicketType,
  };
}

export const performanceQueryOptions = queryOptions({
  queryKey: ["analytics", "performance"],
  queryFn: loadPerformance,
});
