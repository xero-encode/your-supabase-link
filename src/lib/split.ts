/**
 * Pure split calculation utilities.
 *
 * The distributor share is the percentage of gross box office owed to the
 * distributor under a Deal. We round half-up to the nearest penny, ONCE,
 * at the very end — never on intermediate values.
 */

export function roundPennyHalfUp(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  // Multiply by 100, round half-up, divide back. Add a tiny epsilon to
  // guard against IEEE-754 representations like 12.345 → 1234.4999999.
  const scaled = amount * 100;
  const rounded = Math.floor(scaled + 0.5 + Number.EPSILON * scaled);
  return rounded / 100;
}

/**
 * Distributor share for a single line.
 * Returns 0 when gross is null/undefined or when there's no valid split.
 */
export function distributorShare(
  gross: number | null | undefined,
  splitPercentage: number | null | undefined,
): number {
  if (gross == null || splitPercentage == null) return 0;
  if (!Number.isFinite(gross) || !Number.isFinite(splitPercentage)) return 0;
  return roundPennyHalfUp((gross * splitPercentage) / 100);
}

export interface LineForTotals {
  gross_amount: number | null;
  admissions: number | null;
  deal?: { split_percentage: number | null } | null;
}

export interface StatementTotals {
  totalGross: number;
  totalAdmissions: number;
  totalOwed: number;
  linesMissingDeal: number;
}

/**
 * Aggregates a set of box office lines into totals.
 * Lines without a matched deal contribute to gross but NOT to owed,
 * and are counted separately so the UI can flag them.
 */
export function statementTotals(lines: LineForTotals[]): StatementTotals {
  let totalGross = 0;
  let totalAdmissions = 0;
  let totalOwed = 0;
  let linesMissingDeal = 0;

  for (const line of lines) {
    const gross = line.gross_amount ?? 0;
    totalGross += gross;
    totalAdmissions += line.admissions ?? 0;
    if (!line.deal) {
      linesMissingDeal += 1;
      continue;
    }
    totalOwed += distributorShare(gross, line.deal.split_percentage);
  }

  return {
    totalGross: roundPennyHalfUp(totalGross),
    totalAdmissions,
    totalOwed: roundPennyHalfUp(totalOwed),
    linesMissingDeal,
  };
}
