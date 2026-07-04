import { supabase } from "@/integrations/supabase/client";
import type {
  BoxOfficeLine,
  Deal,
  Exhibitor,
  Statement,
  Title,
  Venue,
} from "@/lib/db/types";

export interface StatementListItem extends Statement {
  title: Pick<Title, "id" | "name" | "poster_url"> | null;
  exhibitor: Pick<Exhibitor, "id" | "name"> | null;
  totalGross: number;
  invoiceStatus: string | null;
}

interface LineTitleRow {
  gross_amount: number | null;
  deal: { title: Pick<Title, "id" | "name" | "poster_url"> | null } | null;
}

export async function listStatementsWithTotals(): Promise<StatementListItem[]> {
  const { data, error } = await supabase
    .from("statements")
    .select(
      `id, exhibitor_id, file_url, raw_extracted_json, fx_rate_applied,
       period_start, period_end, status, created_at,
       exhibitor:exhibitors(id, name),
       invoices(xero_status),
       box_office_lines(gross_amount, deal:deals(title:titles(id, name, poster_url)))`,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  type Row = Omit<StatementListItem, "totalGross" | "title" | "exhibitor" | "invoiceStatus"> & {
    exhibitor: StatementListItem["exhibitor"];
    box_office_lines: LineTitleRow[] | null;
    invoices: { xero_status: string | null }[] | null;
  };

  return (data as unknown as Row[]).map((row) => {
    const lines = row.box_office_lines ?? [];
    const totalGross = lines.reduce((acc, l) => acc + (l.gross_amount ?? 0), 0);
    const title = lines.find((l) => l.deal?.title)?.deal?.title ?? null;
    const invoiceStatus = row.invoices?.[0]?.xero_status ?? null;
    const { box_office_lines: _l, invoices: _i, ...rest } = row;
    void _l;
    void _i;
    return { ...rest, title, totalGross, invoiceStatus };
  });
}

export interface LineWithDeal extends BoxOfficeLine {
  venue: Pick<Venue, "id" | "name"> | null;
  deal:
    | (Pick<Deal, "id" | "split_percentage"> & { title: Pick<Title, "id" | "name"> | null })
    | null;
}

export interface StatementDetail extends Statement {
  title: Title | null;
  exhibitor: Exhibitor | null;
  box_office_lines: LineWithDeal[];
}

export async function getStatement(id: string): Promise<StatementDetail | null> {
  const { data, error } = await supabase
    .from("statements")
    .select(
      `id, exhibitor_id, file_url, raw_extracted_json, fx_rate_applied,
       period_start, period_end, status, created_at,
       exhibitor:exhibitors(*),
       box_office_lines(
         id, statement_id, venue_id, play_date, screen, format,
         ticket_type, admissions, gross_amount, deal_id, created_at,
         venue:venues(id, name),
         deal:deals(id, split_percentage, title:titles(id, name))
       )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const raw = data as unknown as Omit<StatementDetail, "title" | "box_office_lines"> & {
    box_office_lines: LineWithDeal[];
  };

  // Sort lines by play_date for a stable view
  const sortedLines = [...raw.box_office_lines].sort((a, b) => {
    if (!a.play_date) return 1;
    if (!b.play_date) return -1;
    return a.play_date.localeCompare(b.play_date);
  });

  // Derive the title from the first line's deal
  const firstTitle = sortedLines.find((l) => l.deal?.title)?.deal?.title ?? null;
  const title: Title | null = firstTitle
    ? { id: firstTitle.id, name: firstTitle.name, poster_url: null, created_at: "" }
    : null;

  return {
    ...raw,
    title,
    box_office_lines: sortedLines,
  };
}

export async function markStatementReviewed(id: string): Promise<void> {
  const { error } = await supabase
    .from("statements")
    .update({ status: "reviewed" })
    .eq("id", id);
  if (error) throw error;
}
