import { describe, it, expect } from "vitest";
import { distributorShare, statementTotals, roundPennyHalfUp } from "./split";

describe("roundPennyHalfUp", () => {
  it("rounds half up at the penny", () => {
    expect(roundPennyHalfUp(12.345)).toBe(12.35);
    expect(roundPennyHalfUp(12.344)).toBe(12.34);
    expect(roundPennyHalfUp(0)).toBe(0);
  });
});

describe("distributorShare", () => {
  it("takes the given percentage of gross", () => {
    expect(distributorShare(1000, 40)).toBe(400);
    expect(distributorShare(1234.56, 50)).toBe(617.28);
  });

  it("rounds half up at the final penny", () => {
    // 24.69 * 50% = 12.345 → 12.35
    expect(distributorShare(24.69, 50)).toBe(12.35);
  });

  it("returns 0 for null/undefined gross or split", () => {
    expect(distributorShare(null, 40)).toBe(0);
    expect(distributorShare(1000, null)).toBe(0);
    expect(distributorShare(undefined, undefined)).toBe(0);
  });
});

describe("statementTotals", () => {
  it("sums gross and owed across lines", () => {
    const totals = statementTotals([
      { gross_amount: 1000, admissions: 50, deal: { split_percentage: 50 } },
      { gross_amount: 200, admissions: 20, deal: { split_percentage: 40 } },
    ]);
    expect(totals.totalGross).toBe(1200);
    expect(totals.totalOwed).toBe(580);
    expect(totals.linesMissingDeal).toBe(0);
  });

  it("flags lines without a deal but still counts their gross", () => {
    const totals = statementTotals([
      { gross_amount: 1000, admissions: 80, deal: { split_percentage: 50 } },
      { gross_amount: 500, admissions: 40, deal: null },
    ]);
    expect(totals.totalGross).toBe(1500);
    expect(totals.totalOwed).toBe(500);
    expect(totals.linesMissingDeal).toBe(1);
  });

  it("handles empty input", () => {
    const totals = statementTotals([]);
    expect(totals.totalGross).toBe(0);
    expect(totals.totalOwed).toBe(0);
    expect(totals.linesMissingDeal).toBe(0);
  });

  it("treats null gross as zero", () => {
    const totals = statementTotals([
      { gross_amount: null, admissions: 0, deal: { split_percentage: 50 } },
    ]);
    expect(totals.totalGross).toBe(0);
    expect(totals.totalOwed).toBe(0);
  });
});
