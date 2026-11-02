// One tool registry shared by the stdio and Cloudflare Worker entries.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AS_OF, DISCLAIMER, FILING_STATUSES, InputError, SOURCES, moreUrl,
  getFederalPovertyLevel, calculatePremiumTaxCredit, checkSubsidyCliff, getAptcRepaymentCap,
} from "./core.js";

export const SERVER_NAME = "aca-premium-tax-credit-calculator-mcp";
export const SERVER_VERSION = "1.0.0";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Payload = Record<string, unknown>;
function reply(summary: string, data: Payload, source: string) {
  const body = { ...data, summary, as_of: AS_OF, source, more: moreUrl(), disclaimer: DISCLAIMER };
  return {
    content: [
      { type: "text" as const, text: `${summary}\n\n${DISCLAIMER}` },
      { type: "text" as const, text: JSON.stringify(body, null, 2) },
    ],
    structuredContent: body,
  };
}

function run(fn: () => ReturnType<typeof reply>) {
  try {
    return fn();
  } catch (e) {
    const msg = e instanceof InputError ? e.message : `Unexpected error: ${(e as Error).message}`;
    return { isError: true, content: [{ type: "text" as const, text: msg }] };
  }
}

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const size = z.number().int().min(1).max(30).describe("Tax family size: you, your spouse if filing jointly, and every dependent you claim.");
const state = z.string().min(2).max(40).describe("State of residence: two-letter code or name (AK and HI have their own poverty lines; all other states and DC share one).");
const income = z.number().min(0).max(100000000).describe("Household income in dollars for the coverage year: modified AGI of you, your spouse and dependents who must file.");
const benchmark = z.number().positive().max(10000000).describe("Premium of the second lowest cost silver plan (SLCSP, the benchmark) for the household, from HealthCare.gov or Form 1095-A column B.");
const period = z.enum(["annual", "monthly"]).optional().describe("Whether premiums are annual (default) or monthly amounts.");

export function registerTools(server: McpServer): void {
  server.registerTool(
    "get_federal_poverty_level",
    {
      title: "Federal poverty line for ACA premium tax credits",
      description:
        "Returns the federal poverty line (FPL) used for the ACA premium tax credit for a coverage year, household size and state, plus the 100%, 133%, 138%, 150%, 200%, 250%, 300% and 400% income thresholds. Coverage year Y uses the HHS guidelines published in year Y-1: 2026 coverage uses the 2025 guidelines ($15,650 for one person in the 48 states and DC, $19,550 Alaska, $17,990 Hawaii); 2025 coverage uses 2024; 2027 coverage uses 2026. Copied from the Federal Register notices, not model memory.",
      inputSchema: {
        year: z.number().int().optional().describe("Coverage (tax) year: 2025, 2026 or 2027. Default 2026."),
        household_size: size,
        state,
        household_income: income.optional(),
      },
      annotations: { ...RO, title: "Federal poverty level" },
    },
    async (a) => run(() => {
      const r = getFederalPovertyLevel(a) as Record<string, any>;
      let s = `For ${r.coverage_year} coverage, the federal poverty line for a household of ${r.household_size} in ${r.state} is ${money(r.federal_poverty_line)} (${r.guideline_year} HHS guidelines, ${r.table} table). 138% is ${money(r.thresholds.pct_138)}, 400% is ${money(r.thresholds.pct_400)}.`;
      if (r.percent_of_fpl !== undefined) s += ` Income of ${money(r.household_income)} is ${r.percent_of_fpl}% of FPL.`;
      return reply(s, r, r.source);
    }),
  );

  server.registerTool(
    "calculate_premium_tax_credit",
    {
      title: "ACA premium tax credit (Obamacare subsidy) for 2025 or 2026",
      description:
        "Calculates the ACA Marketplace premium tax credit (IRC sec. 36B) the way Form 8962 does. For 2026 coverage the enhanced ARPA/IRA credits have expired (no extension enacted as of 2026-11-02): the IRS Rev. Proc. 2025-25 table applies (2.10% of income below 133% FPL rising to 9.96% at 300-400% FPL) and there is NO credit above 400% FPL. For 2025 the enhanced table applies (0% up to 150% FPL, 8.5% cap, no income limit). Returns FPL percentage, applicable figure, expected contribution, annual and monthly credit, and net premium. Models trained before 2026 often still apply the 8.5% cap to 2026.",
      inputSchema: {
        household_income: income,
        household_size: size,
        state,
        benchmark_premium: benchmark,
        year: z.number().int().optional().describe("Coverage (tax) year: 2025 or 2026. Default 2026."),
        enrolled_premium: z.number().min(0).max(10000000).optional().describe("Premium of the plan you actually enroll in. The credit cannot exceed it. Optional."),
        premium_period: period,
      },
      annotations: { ...RO, title: "Premium tax credit" },
    },
    async (a) => run(() => {
      const r = calculatePremiumTaxCredit(a) as Record<string, any>;
      const s = r.eligible
        ? `${r.year} premium tax credit: income ${money(r.household_income)} is ${r.percent_of_fpl}% of the ${money(r.federal_poverty_line)} poverty line, applicable figure ${(r.applicable_figure * 100).toFixed(2)}%, so the household is expected to pay ${money(r.annual_contribution)} a year (${money(r.monthly_contribution)} a month) toward the ${money(r.benchmark_premium_annual)} benchmark plan. Credit: ${money(r.premium_tax_credit_annual)} a year (${money(r.premium_tax_credit_monthly)} a month)${r.limited_by_enrolled_premium ? ", limited to the enrolled premium" : ""}. ${r.year === 2026 ? "2026 rules: enhanced credits expired, 400% FPL limit applies." : "2025 rules: enhanced credits."}`
        : `${r.year} premium tax credit: none. ${r.reason}`;
      return reply(s, r, a.year === 2025 ? SOURCES.i8962 : SOURCES.revProc202525);
    }),
  );

  server.registerTool(
    "check_subsidy_cliff",
    {
      title: "2026 ACA subsidy cliff at 400% FPL",
      description:
        "Shows the dollar effect of the 400% federal poverty line subsidy cliff that returned for 2026 coverage after the enhanced premium tax credits expired: the cliff income for the household, the credit at exactly 400% FPL, the credit at $1 more (zero), and the loss. With household_income it also gives the credit under 2026 rules, what the expired 2021-2025 enhanced rules would have given, and how much modified AGI must drop (for example through HSA or retirement contributions) to get back under the cliff.",
      inputSchema: {
        household_size: size,
        state,
        benchmark_premium: benchmark,
        household_income: income.optional(),
        premium_period: period,
      },
      annotations: { ...RO, title: "Subsidy cliff" },
    },
    async (a) => run(() => {
      const r = checkSubsidyCliff(a) as Record<string, any>;
      let s = `2026 subsidy cliff for a household of ${r.household_size} in ${r.state}: income up to ${money(r.cliff_income)} (400% FPL) gets ${money(r.credit_at_400_percent)} a year toward a ${money(r.benchmark_premium_annual)} benchmark plan; $1 more gets ${money(r.credit_one_dollar_over)}. Cliff loss: ${money(r.cliff_loss)}.`;
      if (r.household_income !== undefined) {
        s += ` At ${money(r.household_income)} (${r.percent_of_fpl}% FPL) the 2026 credit is ${money(r.credit_2026_rules)}; under the expired enhanced rules it would be ${money(r.credit_if_enhanced_rules_had_continued)}.`;
        s += r.over_cliff ? ` Cutting modified AGI by ${money(r.income_reduction_needed)} would restore ${money(r.credit_if_income_reduced_to_cliff)}.` : ` Headroom below the cliff: ${money(r.headroom_below_cliff)}.`;
      }
      return reply(s, r, SOURCES.ptcQa);
    }),
  );

  server.registerTool(
    "get_aptc_repayment_cap",
    {
      title: "Excess advance premium tax credit repayment cap",
      description:
        "Returns the cap on repaying excess advance premium tax credit (APTC) at tax time. For tax year 2025: Form 8962 Table 5 ($375/$750 below 200% FPL, $975/$1,950 at 200-300%, $1,625/$3,250 at 300-400%, single/other filing status; no cap at 400% or more). For tax year 2026 and later there is NO cap: the One Big Beautiful Bill Act (P.L. 119-21 sec. 71305) repealed it, so the full excess is repaid. Many models trained before 2026 still quote the old caps.",
      inputSchema: {
        tax_year: z.number().int().optional().describe("Tax year: 2025 or later. Default 2026."),
        household_income: income,
        household_size: size,
        state,
        filing_status: z.enum(FILING_STATUSES).describe("Filing status. Table 5 has a single column and an any-other-status column."),
        excess_aptc: z.number().min(0).max(10000000).optional().describe("Advance payments minus the credit you are allowed (Form 8962 line 27). Optional."),
      },
      annotations: { ...RO, title: "APTC repayment cap" },
    },
    async (a) => run(() => {
      const r = getAptcRepaymentCap(a) as Record<string, any>;
      let s = r.has_cap
        ? `Tax year ${r.tax_year}: repayment of excess APTC is capped at ${money(r.cap)} (${r.filing_status}, ${r.form_8962_line_5}% FPL).`
        : `Tax year ${r.tax_year}: no repayment cap. ${r.rule}`;
      if (r.amount_to_repay !== null && r.amount_to_repay !== undefined) s += ` Amount to repay: ${money(r.amount_to_repay)}.`;
      return reply(s, r, r.source);
    }),
  );
}

export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerTools(server);
  return server;
}
