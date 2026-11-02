// Fixtures: expected values hand-checked against the Federal Register HHS poverty guideline notices
// (2024-00796, 2025-01377, 2026-00755), Rev. Proc. 2025-25 sec. 3, the Form 8962 (2025) instructions
// Tables 1-1, 2 and 5, and P.L. 119-21 sec. 71305.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getFederalPovertyLevel as fpl, calculatePremiumTaxCredit as ptc, checkSubsidyCliff as cliff,
  getAptcRepaymentCap as cap, applicableFigure, TABLE_2025, TABLE_2026, InputError,
} from "../dist/core.js";

test("F1 2026 coverage, 1 person, 48 states: 2025 guideline $15,650", () => {
  const r = fpl({ year: 2026, household_size: 1, state: "TX" });
  assert.equal(r.guideline_year, 2025);
  assert.equal(r.federal_poverty_line, 15650);
  assert.equal(r.thresholds.pct_400, 62600);
});

test("F2 2026 coverage, 4 persons: Alaska $40,190, Hawaii $36,980", () => {
  assert.equal(fpl({ year: 2026, household_size: 4, state: "Alaska" }).federal_poverty_line, 40190);
  assert.equal(fpl({ year: 2026, household_size: 4, state: "hi" }).federal_poverty_line, 36980);
});

test("F3 2026 coverage, 10 persons, 48 states: $54,150 + 2 x $5,500 = $65,150", () => {
  assert.equal(fpl({ year: 2026, household_size: 10, state: "DC" }).federal_poverty_line, 65150);
});

test("F4 2025 coverage uses 2024 guidelines ($15,060, Form 8962 Table 1-1); 2027 uses 2026 ($15,960)", () => {
  assert.equal(fpl({ year: 2025, household_size: 1, state: "CA" }).federal_poverty_line, 15060);
  assert.equal(fpl({ year: 2027, household_size: 1, state: "CA" }).federal_poverty_line, 15960);
});

test("F5 2025 enhanced table reproduces Form 8962 (2025) Table 2", () => {
  for (const [l5, fig] of [[149, 0], [197, 0.0188], [251, 0.0404], [353, 0.0733], [399, 0.0848], [450, 0.085]]) {
    assert.equal(applicableFigure(TABLE_2025, l5), fig, `line 5 = ${l5}`);
  }
});

test("F6 2026 table (Rev. Proc. 2025-25): 132 -> 2.10%, 140 -> 3.57%, 200 -> 6.60%, 255 -> 8.59%, 350 -> 9.96%", () => {
  for (const [l5, fig] of [[132, 0.021], [140, 0.0357], [200, 0.066], [255, 0.0859], [350, 0.0996], [400, 0.0996]]) {
    assert.equal(applicableFigure(TABLE_2026, l5), fig, `line 5 = ${l5}`);
  }
});

test("F7 2026 single $40,000 TX, benchmark $7,200: 255% -> 8.59% -> $3,436 -> credit $3,764", () => {
  const r = ptc({ household_income: 40000, household_size: 1, state: "TX", benchmark_premium: 7200, year: 2026 });
  assert.equal(r.form_8962_line_5, 255);
  assert.equal(r.annual_contribution, 3436);
  assert.equal(r.premium_tax_credit_annual, 3764);
});

test("F8 2026 single at exactly 400% ($62,600): 9.96% -> $6,234.96 -> credit $965.04", () => {
  const r = ptc({ household_income: 62600, household_size: 1, state: "TX", benchmark_premium: 7200 });
  assert.equal(r.eligible, true);
  assert.equal(r.annual_contribution, 6234.96);
  assert.equal(r.premium_tax_credit_annual, 965.04);
});

test("F9 2026 single $62,601: over 400% FPL, no credit", () => {
  const r = ptc({ household_income: 62601, household_size: 1, state: "TX", benchmark_premium: 7200 });
  assert.equal(r.eligible, false);
  assert.equal(r.premium_tax_credit_annual, 0);
});

test("F10 2025 single $80,000 (531% FPL): enhanced 8.5% cap -> $6,800 -> credit $400", () => {
  const r = ptc({ household_income: 80000, household_size: 1, state: "TX", benchmark_premium: 7200, year: 2025 });
  assert.equal(r.applicable_figure, 0.085);
  assert.equal(r.premium_tax_credit_annual, 400);
});

test("F11 2026 single $15,000: below 100% FPL, not eligible", () => {
  assert.equal(ptc({ household_income: 15000, household_size: 1, state: "OH", benchmark_premium: 7200 }).eligible, false);
});

test("F12 2026 single $20,000: 127% -> 2.10% -> $420; credit capped at enrolled premium $5,000", () => {
  const r = ptc({ household_income: 20000, household_size: 1, state: "OH", benchmark_premium: 7200, enrolled_premium: 5000 });
  assert.equal(r.annual_contribution, 420);
  assert.equal(r.premium_tax_credit_annual, 5000);
  assert.equal(r.limited_by_enrolled_premium, true);
  assert.equal(r.net_premium_annual, 0);
});

test("F13 monthly premiums: $600/month benchmark gives the same $3,764 as F7 ($313.67/month)", () => {
  const r = ptc({ household_income: 40000, household_size: 1, state: "TX", benchmark_premium: 600, premium_period: "monthly" });
  assert.equal(r.premium_tax_credit_annual, 3764);
  assert.equal(r.premium_tax_credit_monthly, 313.67);
});

test("F14 Alaska single $50,000, benchmark $9,000: 255% of $19,550 -> $4,295 -> credit $4,705", () => {
  assert.equal(ptc({ household_income: 50000, household_size: 1, state: "AK", benchmark_premium: 9000 }).premium_tax_credit_annual, 4705);
});

test("F15 cliff, family of 4, benchmark $24,000: cliff $128,600, credit $11,191.44 then $0", () => {
  const r = cliff({ household_size: 4, state: "FL", benchmark_premium: 24000 });
  assert.equal(r.cliff_income, 128600);
  assert.equal(r.credit_at_400_percent, 11191.44);
  assert.equal(r.credit_one_dollar_over, 0);
  assert.equal(r.cliff_loss, 11191.44);
});

test("F16 cliff at $130,000: over by $1,400; enhanced rules would give $12,950", () => {
  const r = cliff({ household_size: 4, state: "FL", benchmark_premium: 24000, household_income: 130000 });
  assert.equal(r.over_cliff, true);
  assert.equal(r.income_reduction_needed, 1400);
  assert.equal(r.credit_2026_rules, 0);
  assert.equal(r.credit_if_enhanced_rules_had_continued, 12950);
});

test("F17 2025 repayment caps (Table 5): $30,000 single 199% -> $375, MFJ $750, $30,120 (200%) -> $975, 400% -> none", () => {
  const b = { tax_year: 2025, household_size: 1, state: "TX" };
  assert.equal(cap({ ...b, household_income: 30000, filing_status: "single" }).cap, 375);
  assert.equal(cap({ ...b, household_income: 30000, filing_status: "married_filing_jointly" }).cap, 750);
  assert.equal(cap({ ...b, household_income: 30120, filing_status: "single" }).cap, 975);
  const r = cap({ ...b, household_income: 60240, filing_status: "single", excess_aptc: 4000 });
  assert.equal(r.cap, null);
  assert.equal(r.amount_to_repay, 4000);
  assert.equal(cap({ ...b, household_income: 50000, filing_status: "head_of_household", excess_aptc: 9000 }).amount_to_repay, 3250);
});

test("F18 2026 repayment: no cap, full excess repaid (P.L. 119-21 sec. 71305)", () => {
  const r = cap({ tax_year: 2026, household_income: 30000, household_size: 1, state: "TX", filing_status: "single", excess_aptc: 5000 });
  assert.equal(r.has_cap, false);
  assert.equal(r.amount_to_repay, 5000);
});

test("F19 errors: 2027 credit not confirmed, unknown state, bad size", () => {
  assert.throws(() => ptc({ household_income: 40000, household_size: 1, state: "TX", benchmark_premium: 7200, year: 2027 }), InputError);
  assert.throws(() => fpl({ household_size: 1, state: "PR" }), InputError);
  assert.throws(() => fpl({ household_size: 0, state: "TX" }), InputError);
});
