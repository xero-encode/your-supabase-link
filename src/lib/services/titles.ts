import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { Title } from "@/lib/db/types";

export async function listTitles(): Promise<Title[]> {
  const { data, error } = await supabase
    .from("titles")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Title[];
}

export interface FeaturedTitle {
  id: string;
  name: string;
  poster_url: string | null;
  totalTakings: number;
}

export async function listFeaturedTitlesWithTakings(
  limit = 3,
): Promise<FeaturedTitle[]> {
  const { data: titles, error } = await supabase
    .from("titles")
    .select("id, name, poster_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const list = (titles ?? []) as Pick<
    Title,
    "id" | "name" | "poster_url"
  >[];
  if (list.length === 0) return [];

  // statements has no title_id column; derive takings via
  // box_office_lines -> deals -> titles.
  const ids = list.map((t) => t.id);
  const { data: lines, error: linesErr } = await supabase
    .from("box_office_lines")
    .select("gross_amount, deal:deals!inner(title_id)")
    .in("deal.title_id", ids);
  if (linesErr) throw linesErr;

  const totals = new Map<string, number>();
  for (const row of (lines ?? []) as {
    gross_amount: number | null;
    deal: { title_id: string } | null;
  }[]) {
    const tid = row.deal?.title_id;
    if (!tid) continue;
    totals.set(tid, (totals.get(tid) ?? 0) + (row.gross_amount ?? 0));
  }

  return list.map((t) => ({
    id: t.id,
    name: t.name,
    poster_url: t.poster_url,
    totalTakings: totals.get(t.id) ?? 0,
  }));
}

export const featuredTitlesQueryOptions = queryOptions({
  queryKey: ["titles", "featured", 3],
  queryFn: () => listFeaturedTitlesWithTakings(3),
});
