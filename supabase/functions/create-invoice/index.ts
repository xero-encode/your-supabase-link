// Supabase Edge Function: create-invoice
//
// Deploy with: supabase functions deploy create-invoice
//
// This is a STUB for the ReelTake demo. In production, this function will
// call the Make webhook that talks to Xero. For now it recomputes the
// invoice amount server-side from box_office_lines + deals, inserts an
// invoice row with a fake xero_invoice_id, and flips the statement to
// "invoiced".

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function roundPennyHalfUp(amount: number): number {
  const scaled = amount * 100;
  return Math.floor(scaled + 0.5) / 100;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { statementId } = await req.json();
    if (!statementId) throw new Error("statementId is required");

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Missing Supabase env vars");

    const supabase = createClient(url, key);

    // Load statement + lines + deals
    const { data: statement, error: sErr } = await supabase
      .from("statements")
      .select(
        `id, status, exhibitor_id,
         box_office_lines(gross_amount, deal:deals(split_percentage))`,
      )
      .eq("id", statementId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!statement) throw new Error("Statement not found");
    if (statement.status !== "reviewed") {
      throw new Error(
        `Statement must be 'reviewed' before invoicing (current: ${statement.status})`,
      );
    }
    if (!statement.exhibitor_id) throw new Error("Statement has no exhibitor");

    // Enforce one-invoice-per-statement (product rule, not a DB constraint)
    const { data: existing, error: eErr } = await supabase
      .from("invoices")
      .select("id")
      .eq("statement_id", statementId)
      .maybeSingle();
    if (eErr) throw eErr;
    if (existing) throw new Error("An invoice already exists for this statement");

    // Recompute owed server-side
    let totalOwed = 0;
    for (const line of (statement as any).box_office_lines ?? []) {
      const gross = line.gross_amount ?? 0;
      const split = line.deal?.split_percentage ?? null;
      if (split == null) throw new Error("A line is missing a deal — cannot invoice");
      totalOwed += (gross * split) / 100;
    }
    const amount = roundPennyHalfUp(totalOwed);

    const xeroInvoiceId = `DEMO-INV-${Date.now()}`;
    const xeroStatus = "DRAFT";

    const { error: insErr } = await supabase.from("invoices").insert({
      statement_id: statementId,
      exhibitor_id: statement.exhibitor_id,
      xero_invoice_id: xeroInvoiceId,
      amount,
      xero_status: xeroStatus,
    });
    if (insErr) throw insErr;

    const { error: uErr } = await supabase
      .from("statements")
      .update({ status: "invoiced" })
      .eq("id", statementId);
    if (uErr) throw uErr;

    return Response.json(
      { ok: true, xeroInvoiceId, xeroStatus, amount },
      { headers: CORS },
    );
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 400, headers: CORS },
    );
  }
});
