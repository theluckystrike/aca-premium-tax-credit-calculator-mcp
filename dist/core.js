// Pure core: ACA premium tax credit (IRC sec. 36B) for 2025 and 2026 coverage. No I/O.
// The enhanced credits (ARPA/IRA: no 400% FPL limit, 0% to 8.5% table) covered tax years 2021-2025 only.
// No law enacted through P.L. 119-136 (2026-10-22) extended them, so 2026 coverage uses the original
// table indexed by Rev. Proc. 2025-25 and the 400% FPL cliff is back. OBBBA (P.L. 119-21) sec. 71305
// removed the cap on repaying excess advance credit for tax years after 2025.
// Every number was copied from a primary source fetched on 2026-11-02; see DATA_SOURCES.md.
export const AS_OF = "2026-11-02";
export const REPO = "aca-premium-tax-credit-calculator-mcp";
export const DISCLAIMER = "General information, not tax advice. The Marketplace and Form 8962 decide the official amounts. Benchmark (second lowest cost silver) premiums vary by ZIP code, age and household; get yours from HealthCare.gov or your state Marketplace.";
export const SOURCES = {
    revProc202525: "https://www.irs.gov/pub/irs-drop/rp-25-25.pdf",
    ptcQa: "https://www.irs.gov/affordable-care-act/individuals-and-families/questions-and-answers-on-the-premium-tax-credit",
    i8962: "https://www.irs.gov/instructions/i8962",
    fpl2026: "https://www.federalregister.gov/documents/2026/01/15/2026-00755/annual-update-of-the-hhs-poverty-guidelines",
    fpl2025: "https://www.federalregister.gov/documents/2025/01/17/2025-01377/annual-update-of-the-hhs-poverty-guidelines",
    fpl2024: "https://www.federalregister.gov/documents/2024/01/17/2024-00796/annual-update-of-the-hhs-poverty-guidelines",
    obbba: "https://www.congress.gov/119/bills/hr1/BILLS-119hr1enr.htm",
    laws119: "https://api.congress.gov/v3/law/119",
};
const MORE = "https://taxbreakcalc.com/hsa-calculator/";
export function moreUrl() {
    return `${MORE}?utm_source=mcp&utm_medium=${REPO}`;
}
export class InputError extends Error {
}
export const LAW_STATUS = "Enhanced premium tax credits (American Rescue Plan Act and Inflation Reduction Act) applied to tax years 2021 through 2025 only. IRS PTC Q&A (Q7, updated Feb. 19, 2026) says the 400% FPL limit was lifted for 2021 through 2025. No public law of the 119th Congress through P.L. 119-136 (Oct. 22, 2026) amends IRC sec. 36B to extend them (checked: Consolidated Appropriations Act 2026, Continuing Appropriations and Extensions Act 2027 and the other appropriations acts contain no sec. 36B text). For 2026 coverage the 400% FPL limit applies and Rev. Proc. 2025-25 sets the table (2.10% to 9.96%). Checked 2026-11-02; if Congress acts later, this server is out of date.";
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
// Federal Register annual update notices (HHS/ASPE). base[i] = household of i+1 persons, i = 0..7.
export const POVERTY_GUIDELINES = {
    2024: {
        contiguous: { base: [15060, 20440, 25820, 31200, 36580, 41960, 47340, 52720], add: 5380 },
        alaska: { base: [18810, 25540, 32270, 39000, 45730, 52460, 59190, 65920], add: 6730 },
        hawaii: { base: [17310, 23500, 29690, 35880, 42070, 48260, 54450, 60640], add: 6190 },
    },
    2025: {
        contiguous: { base: [15650, 21150, 26650, 32150, 37650, 43150, 48650, 54150], add: 5500 },
        alaska: { base: [19550, 26430, 33310, 40190, 47070, 53950, 60830, 67710], add: 6880 },
        hawaii: { base: [17990, 24320, 30650, 36980, 43310, 49640, 55970, 62300], add: 6330 },
    },
    2026: {
        contiguous: { base: [15960, 21640, 27320, 33000, 38680, 44360, 50040, 55720], add: 5680 },
        alaska: { base: [19950, 27050, 34150, 41250, 48350, 55450, 62550, 69650], add: 7100 },
        hawaii: { base: [18360, 24890, 31420, 37950, 44480, 51010, 57540, 64070], add: 6530 },
    },
};
const GUIDELINE_SOURCE = { 2024: SOURCES.fpl2024, 2025: SOURCES.fpl2025, 2026: SOURCES.fpl2026 };
const STATES = {
    AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado", CT: "connecticut",
    DE: "delaware", DC: "district of columbia", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois",
    IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland",
    MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi", MO: "missouri", MT: "montana",
    NE: "nebraska", NV: "nevada", NH: "new hampshire", NJ: "new jersey", NM: "new mexico", NY: "new york",
    NC: "north carolina", ND: "north dakota", OH: "ohio", OK: "oklahoma", OR: "oregon", PA: "pennsylvania",
    RI: "rhode island", SC: "south carolina", SD: "south dakota", TN: "tennessee", TX: "texas", UT: "utah",
    VT: "vermont", VA: "virginia", WA: "washington", WV: "west virginia", WI: "wisconsin", WY: "wyoming",
};
export function resolveState(state) {
    const s = (state ?? "").trim();
    if (!s)
        throw new InputError("state is required: a two-letter code (for example TX, AK, HI, DC) or a state name.");
    const up = s.toUpperCase();
    let code = STATES[up] ? up : Object.keys(STATES).find((k) => STATES[k] === s.toLowerCase());
    if (!code)
        throw new InputError(`Unknown state "${s}". Use one of the 50 states or DC (two-letter code or full name). Premium tax credits are not available through the US territories' own programs.`);
    return { code, region: code === "AK" ? "alaska" : code === "HI" ? "hawaii" : "contiguous" };
}
export const SUPPORTED_COVERAGE_YEARS = [2025, 2026, 2027];
function guidelineAmount(gYear, region, size) {
    const g = POVERTY_GUIDELINES[gYear][region];
    return size <= 8 ? g.base[size - 1] : g.base[7] + (size - 8) * g.add;
}
function checkSize(size) {
    if (!Number.isInteger(size) || size < 1 || size > 30)
        throw new InputError("household_size must be a whole number from 1 to 30 (tax family: you, spouse if filing jointly, and dependents you claim).");
}
export function getFederalPovertyLevel(a) {
    const year = a.year ?? 2026;
    if (!SUPPORTED_COVERAGE_YEARS.includes(year))
        throw new InputError(`year must be a coverage (tax) year in ${SUPPORTED_COVERAGE_YEARS.join(", ")}. Coverage year Y uses the HHS guidelines published in year Y-1.`);
    checkSize(a.household_size);
    const { code, region } = resolveState(a.state);
    const gYear = year - 1;
    const fpl = guidelineAmount(gYear, region, a.household_size);
    const thresholds = {};
    for (const p of [100, 133, 138, 150, 200, 250, 300, 400])
        thresholds[`pct_${p}`] = round2((fpl * p) / 100);
    const out = {
        coverage_year: year,
        guideline_year: gYear,
        household_size: a.household_size,
        state: code,
        table: region === "contiguous" ? "48 contiguous states and DC" : region === "alaska" ? "Alaska" : "Hawaii",
        federal_poverty_line: fpl,
        additional_person_amount: POVERTY_GUIDELINES[gYear][region].add,
        thresholds,
        rule: `For the premium tax credit, coverage year ${year} uses the ${gYear} HHS poverty guidelines (the ones in effect on the first day of open enrollment). 138% is the usual Medicaid expansion limit; 400% is the premium tax credit ceiling ${year >= 2026 ? "again from 2026" : "that did not apply in 2021-2025"}.`,
        source: GUIDELINE_SOURCE[gYear],
    };
    if (a.household_income !== undefined) {
        out.household_income = a.household_income;
        out.percent_of_fpl = Math.round((a.household_income / fpl) * 10000) / 100;
    }
    return out;
}
// 2026: Rev. Proc. 2025-25 sec. 3.01 (original sec. 36B(b)(3)(A)(i) table, indexed). Last band is "not more than 400%".
export const TABLE_2026 = [
    { from: 0, to: 133, initial: 2.10, final: 2.10 },
    { from: 133, to: 150, initial: 3.14, final: 4.19 },
    { from: 150, to: 200, initial: 4.19, final: 6.60 },
    { from: 200, to: 250, initial: 6.60, final: 8.44 },
    { from: 250, to: 300, initial: 8.44, final: 9.96 },
    { from: 300, to: 400, initial: 9.96, final: 9.96 },
];
// 2021-2025: sec. 36B(b)(3)(A)(iii) (ARPA/IRA); reproduces Form 8962 (2025) instructions Table 2.
export const TABLE_2025 = [
    { from: 0, to: 150, initial: 0, final: 0 },
    { from: 150, to: 200, initial: 0, final: 2.0 },
    { from: 200, to: 250, initial: 2.0, final: 4.0 },
    { from: 250, to: 300, initial: 4.0, final: 6.0 },
    { from: 300, to: 400, initial: 6.0, final: 8.5 },
    { from: 400, to: Infinity, initial: 8.5, final: 8.5 },
];
export const REQUIRED_CONTRIBUTION_PCT = { 2025: 9.02, 2026: 9.96 };
/** Applicable figure (decimal, 4 places) for a whole-number FPL percentage, as on Form 8962 line 7. */
export function applicableFigure(table, line5) {
    const b = table.find((x) => line5 >= x.from && line5 < x.to) ?? table[table.length - 1];
    const span = b.to - b.from;
    const pct = !isFinite(span) || b.initial === b.final ? b.initial : b.initial + ((b.final - b.initial) * (line5 - b.from)) / span;
    return Math.round((pct / 100 + Number.EPSILON) * 10000) / 10000;
}
const TAX_YEARS_PTC = [2025, 2026];
export function calculatePremiumTaxCredit(a) {
    const year = a.year ?? 2026;
    if (!TAX_YEARS_PTC.includes(year)) {
        throw new InputError(year === 2027
            ? "2027 is not supported: the IRS applicable percentage table for 2027 was not confirmed from an IRS source on 2026-11-02. The 2027 poverty line is available from get_federal_poverty_level."
            : `year must be 2025 or 2026 (got ${year}).`);
    }
    checkSize(a.household_size);
    if (!(a.household_income >= 0))
        throw new InputError("household_income must be a number of dollars, 0 or more (modified AGI of everyone in the tax family who must file).");
    if (!(a.benchmark_premium > 0))
        throw new InputError("benchmark_premium must be the second lowest cost silver plan (SLCSP) premium for the household, more than 0.");
    const mult = a.premium_period === "monthly" ? 12 : 1;
    const benchmark = round2(a.benchmark_premium * mult);
    const enrolled = a.enrolled_premium !== undefined ? round2(a.enrolled_premium * mult) : undefined;
    const fpl = getFederalPovertyLevel({ year, household_size: a.household_size, state: a.state });
    const line4 = fpl.federal_poverty_line;
    const exactPct = (a.household_income / line4) * 100;
    const line5 = Math.floor(exactPct + 1e-9);
    const base = {
        year, household_income: a.household_income, household_size: a.household_size, state: fpl.state,
        federal_poverty_line: line4, guideline_year: fpl.guideline_year,
        percent_of_fpl: Math.round(exactPct * 100) / 100, form_8962_line_5: line5,
        benchmark_premium_annual: benchmark, enrolled_premium_annual: enrolled ?? null,
        required_contribution_percentage: REQUIRED_CONTRIBUTION_PCT[year],
        rules: year === 2026 ? "Original sec. 36B table indexed by Rev. Proc. 2025-25; 400% FPL limit applies; no repayment cap (OBBBA sec. 71305)." : "Enhanced ARPA/IRA table (0% to 8.5%), no 400% FPL limit, repayment caps apply.",
        law_status: LAW_STATUS,
    };
    const notEligible = (reason) => ({ ...base, eligible: false, reason, applicable_figure: null, annual_contribution: null, premium_tax_credit_annual: 0, premium_tax_credit_monthly: 0, net_premium_annual: enrolled ?? benchmark });
    if (exactPct < 100)
        return notEligible("Household income is below 100% of the federal poverty line. The credit is generally not allowed (Medicaid is usually the route; an exception applies when the Marketplace estimated income of at least 100% and advance payments were made).");
    if (year === 2026 && a.household_income > 4 * line4)
        return notEligible(`Household income is above 400% of the federal poverty line (${round2(4 * line4)}). For 2026 coverage the enhanced credits have expired, so there is no premium tax credit above 400% FPL (the subsidy cliff).`);
    const figure = applicableFigure(year === 2026 ? TABLE_2026 : TABLE_2025, line5);
    const contribution = round2(a.household_income * figure);
    let ptc = Math.max(0, round2(benchmark - contribution));
    const limitedByEnrolled = enrolled !== undefined && enrolled < ptc;
    if (limitedByEnrolled)
        ptc = enrolled;
    return {
        ...base, eligible: true, applicable_figure: figure, annual_contribution: contribution,
        monthly_contribution: round2(contribution / 12),
        premium_tax_credit_annual: ptc, premium_tax_credit_monthly: round2(ptc / 12),
        limited_by_enrolled_premium: limitedByEnrolled,
        net_premium_annual: enrolled !== undefined ? round2(enrolled - ptc) : round2(benchmark - ptc),
        method: "Form 8962 method: FPL percentage truncated to a whole number (line 5), applicable figure interpolated within its band and rounded to 4 decimals (line 7), contribution = income x figure, credit = benchmark minus contribution, never more than the enrolled premium.",
    };
}
export function checkSubsidyCliff(a) {
    const year = 2026;
    const fpl = getFederalPovertyLevel({ year, household_size: a.household_size, state: a.state });
    const line4 = fpl.federal_poverty_line;
    const limit = 4 * line4;
    const common = { household_size: a.household_size, state: a.state, benchmark_premium: a.benchmark_premium, premium_period: a.premium_period, year };
    const atLimit = calculatePremiumTaxCredit({ ...common, household_income: limit });
    const over = calculatePremiumTaxCredit({ ...common, household_income: limit + 1 });
    const out = {
        coverage_year: year, household_size: a.household_size, state: fpl.state, federal_poverty_line: line4, guideline_year: fpl.guideline_year,
        cliff_income: limit,
        benchmark_premium_annual: atLimit.benchmark_premium_annual,
        credit_at_400_percent: atLimit.premium_tax_credit_annual,
        credit_one_dollar_over: over.premium_tax_credit_annual,
        cliff_loss: round2(atLimit.premium_tax_credit_annual - over.premium_tax_credit_annual),
        explanation: `For 2026 coverage, household income of $${limit.toLocaleString("en-US")} (400% of the ${fpl.guideline_year} poverty line for ${a.household_size}) still gets a credit; $1 more gets none. The enhanced 2021-2025 rules had no cliff: above 400% the benchmark plan cost was capped at 8.5% of income.`,
        law_status: LAW_STATUS,
    };
    if (a.household_income !== undefined) {
        const cur = calculatePremiumTaxCredit({ ...common, household_income: a.household_income });
        const enhancedFig = applicableFigure(TABLE_2025, Math.floor((a.household_income / line4) * 100 + 1e-9));
        const enhanced = a.household_income / line4 < 1 ? 0 : Math.max(0, round2(atLimit.benchmark_premium_annual - round2(a.household_income * enhancedFig)));
        out.household_income = a.household_income;
        out.percent_of_fpl = cur.percent_of_fpl;
        out.over_cliff = a.household_income > limit;
        out.credit_2026_rules = cur.premium_tax_credit_annual;
        out.credit_if_enhanced_rules_had_continued = enhanced;
        out.loss_vs_enhanced_rules = round2(enhanced - cur.premium_tax_credit_annual);
        if (a.household_income > limit) {
            out.income_reduction_needed = round2(a.household_income - limit);
            out.credit_if_income_reduced_to_cliff = atLimit.premium_tax_credit_annual;
            out.tip = "Pre-tax contributions that lower modified AGI (HSA, traditional IRA if deductible, 401(k)/403(b), self-employed retirement plans) can bring income back under 400% FPL.";
        }
        else {
            out.headroom_below_cliff = round2(limit - a.household_income);
        }
    }
    return out;
}
// ---------------------------------------------------------------- excess APTC repayment cap
export const FILING_STATUSES = ["single", "head_of_household", "married_filing_jointly", "married_filing_separately", "qualifying_surviving_spouse"];
// Form 8962 (2025) instructions, Table 5. Repayment Limitation.
export const REPAYMENT_CAPS_2025 = [
    { below: 200, single: 375, other: 750 },
    { below: 300, single: 975, other: 1950 },
    { below: 400, single: 1625, other: 3250 },
];
export function getAptcRepaymentCap(a) {
    const year = a.tax_year ?? 2026;
    if (year < 2025 || year > 2035)
        throw new InputError("tax_year must be 2025 or later (2025 uses Form 8962 Table 5; 2026 and later have no cap under P.L. 119-21 sec. 71305). Earlier years are not covered.");
    if (!(a.household_income >= 0))
        throw new InputError("household_income must be 0 or more.");
    checkSize(a.household_size);
    const { code } = resolveState(a.state);
    const excess = a.excess_aptc;
    if (excess !== undefined && excess < 0)
        throw new InputError("excess_aptc must be 0 or more (advance payments minus the credit you are allowed).");
    if (year >= 2026) {
        return {
            tax_year: year, filing_status: a.filing_status, state: code, household_income: a.household_income,
            cap: null, has_cap: false,
            amount_to_repay: excess ?? null,
            rule: "No repayment cap for tax years beginning after December 31, 2025. P.L. 119-21 (One Big Beautiful Bill Act) sec. 71305 struck sec. 36B(f)(2)(B). You repay the full excess advance premium tax credit, whatever your income (IRS PTC Q&A, Q31).",
            source: SOURCES.obbba,
        };
    }
    const fpl = getFederalPovertyLevel({ year, household_size: a.household_size, state: code });
    const line4 = fpl.federal_poverty_line;
    const line5 = Math.floor((a.household_income / line4) * 100 + 1e-9);
    const row = REPAYMENT_CAPS_2025.find((r) => line5 < r.below);
    const cap = row ? (a.filing_status === "single" ? row.single : row.other) : null;
    return {
        tax_year: year, filing_status: a.filing_status, state: code, household_income: a.household_income,
        federal_poverty_line: line4, guideline_year: fpl.guideline_year, form_8962_line_5: line5,
        cap, has_cap: cap !== null,
        amount_to_repay: excess === undefined ? null : cap === null ? excess : Math.min(excess, cap),
        rule: cap === null
            ? "Household income at or above 400% FPL: no repayment limitation for 2025; repay the full excess (Form 8962 line 28 left blank)."
            : `2025 Form 8962 Table 5: ${a.filing_status === "single" ? "single" : "any other filing status"} column, line 5 ${line5}. ${a.filing_status === "married_filing_separately" ? "Married filing separately: the limit applies to each spouse separately; most MFS filers cannot claim the credit at all." : ""}`.trim(),
        source: SOURCES.i8962,
    };
}
