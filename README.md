# aca-premium-tax-credit-calculator-mcp

ACA premium tax credit calculator MCP server for 2026: the Obamacare subsidy after the enhanced credits expired, the 400% FPL subsidy cliff, federal poverty level tables and APTC repayment rules.

Your model was probably trained when the enhanced premium tax credits (American Rescue Plan Act, extended by the Inflation Reduction Act) were still in force. They covered tax years 2021 through 2025 only. For 2026 coverage the old rules are back with a new IRS table, and repayment caps are gone. This server gives an assistant those rules from primary sources.

## Tools

| Tool | What it does |
| --- | --- |
| `get_federal_poverty_level` | Federal poverty line for coverage years 2025, 2026 and 2027 (48 states and DC, Alaska, Hawaii) with the 100%, 133%, 138%, 150%, 200%, 250%, 300% and 400% thresholds. |
| `calculate_premium_tax_credit` | Premium tax credit the Form 8962 way: FPL percentage, applicable figure, expected contribution, annual and monthly credit, net premium. 2025 (enhanced rules) or 2026 (Rev. Proc. 2025-25). |
| `check_subsidy_cliff` | Dollar effect of crossing 400% FPL for 2026 coverage, the credit the expired rules would have given, and the income cut needed to get back under the cliff. |
| `get_aptc_repayment_cap` | Cap on repaying excess advance premium tax credit: Form 8962 Table 5 for 2025, no cap from 2026. |

Every result has structured JSON, a plain-English summary, `as_of`, a `source` URL and a `more` link.

## What it knows that your model does not

- The enhanced credits ended after tax year 2025. No public law through P.L. 119-136 (October 22, 2026) amends IRC sec. 36B to extend them. Checked 2026-11-02.
- For 2026 coverage there is no premium tax credit above 400% of the federal poverty line. One dollar over the line can cost a family thousands.
- The 2026 applicable percentage table (Rev. Proc. 2025-25) runs from 2.10% of income below 133% FPL to 9.96% at 300% to 400% FPL. The 2025 table ran from 0% to 8.5%.
- The 2026 required contribution percentage (employer coverage affordability) is 9.96%. It was 9.02% for 2025.
- 2026 coverage uses the 2025 HHS poverty guidelines: $15,650 for one person in the 48 states and DC, $19,550 in Alaska, $17,990 in Hawaii, plus $5,500, $6,880 or $6,330 for each extra person.
- From tax year 2026 there is no cap on repaying excess advance credit. The One Big Beautiful Bill Act (P.L. 119-21 sec. 71305) repealed it. For 2025 the caps were $375 to $1,625 (single) and $750 to $3,250 (other filers) below 400% FPL.

## Install

### Claude.ai custom connector or ChatGPT developer mode

Add a custom connector and paste the URL. No token is needed.

```
https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http aca-premium-tax-credit https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp
```

Or run it locally:

```
claude mcp add aca-premium-tax-credit -- npx -y github:theluckystrike/aca-premium-tax-credit-calculator-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aca-premium-tax-credit": {
      "command": "npx",
      "args": ["-y", "github:theluckystrike/aca-premium-tax-credit-calculator-mcp"]
    }
  }
}
```

### Cursor

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "aca-premium-tax-credit": {
      "url": "https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

### VS Code

Add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "aca-premium-tax-credit": {
      "type": "http",
      "url": "https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

Node 20 or newer is needed for the local `npx` version.

## Example prompts

- "I am single in Texas, expect $40,000 of income in 2026 and the benchmark silver plan is $600 a month. What is my premium tax credit?"
- "We are a family of four in Florida earning $130,000. How much does the 2026 subsidy cliff cost us, and how much would we need to put in an HSA to get under it?"
- "What is 400% of the federal poverty level for a household of 3 in Alaska for 2026 coverage?"
- "My advance premium tax credit was $5,000 too high in 2026. Is there a repayment cap?"

## Data sources

All numbers were copied from primary sources fetched on 2026-11-02. See [DATA_SOURCES.md](DATA_SOURCES.md).

## Limitations

- Supports premium tax credit amounts for 2025 and 2026 coverage. The 2027 applicable percentage table was not confirmed from an IRS source on 2026-11-02, so 2027 credit requests return an error. The 2027 poverty line is available.
- You supply the benchmark (second lowest cost silver plan) premium. It depends on ZIP code, ages and household, and this server does not look it up.
- Full-year coverage with one benchmark is assumed. Monthly changes, policy allocation between tax families, and self-employed health insurance deduction iterations are not modeled.
- Eligibility checks are income checks only. Offers of affordable employer coverage, Medicaid eligibility, immigration status rules (including P.L. 119-21 changes) and married-filing-separately exceptions are not decided here.
- The 400% test uses income compared with exactly 4 times the poverty line. The applicable figure uses the Form 8962 method (whole-number FPL percentage, 4-decimal figure).
- If Congress changes sec. 36B after 2026-11-02, this server is out of date until updated.

## More

Lower your modified AGI with an HSA and see the tax effect: [taxbreakcalc.com HSA calculator](https://taxbreakcalc.com/hsa-calculator/?utm_source=mcp&utm_medium=aca-premium-tax-credit-calculator-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

## Development

```
npm install
npm run build
npm test
```

`src/core.ts` holds all the rules and has no I/O. `src/stdio.ts` is the local entry and `src/worker.ts` is the Cloudflare Worker entry. Both use the same tool registry in `src/tools.ts`.

## License

MIT

<!-- data-servers:start -->
## More data servers from the same author

Each one is free, needs no API key and has a hosted URL you can paste into Claude or ChatGPT.

| server | tools | hosted URL |
|---|---|---|
| [cups-to-grams-mcp](https://github.com/theluckystrike/cups-to-grams-mcp) | convert_ingredient, search_ingredients, scale_recipe, convert_oven_temperature | `https://cups-to-grams-mcp.lipmichal.workers.dev/mcp` |
| [dscr-loan-calculator-mcp](https://github.com/theluckystrike/dscr-loan-calculator-mcp) | calculate_dscr, max_loan_for_target_dscr, rent_needed_for_target_dscr, compare_scenarios, amortization_summary | `https://dscr-loan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [gold-price-per-gram-mcp](https://github.com/theluckystrike/gold-price-per-gram-mcp) | get_gold_price_per_gram, get_metal_prices, calculate_jewelry_value, convert_gold_units | `https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp` |
| [lake-level-mcp](https://github.com/theluckystrike/lake-level-mcp) | search_lakes, get_lake_level, get_lake_history, compare_lakes | `https://lake-level-mcp.lipmichal.workers.dev/mcp` |
| [minimum-wage-mcp](https://github.com/theluckystrike/minimum-wage-mcp) | get_minimum_wage, list_upcoming_increases, compare_states, annual_income_at_minimum_wage | `https://minimum-wage-mcp.lipmichal.workers.dev/mcp` |
| [no-tax-on-overtime-mcp](https://github.com/theluckystrike/no-tax-on-overtime-mcp) | calculate_overtime_deduction, calculate_tips_deduction, calculate_senior_deduction, estimate_tax_savings, explain_eligibility | `https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp` |
| [paycheck-calculator-mcp](https://github.com/theluckystrike/paycheck-calculator-mcp) | calculate_take_home_pay, compare_states_take_home, salary_to_hourly, hourly_to_salary, get_federal_tax_brackets | `https://paycheck-calculator-mcp.lipmichal.workers.dev/mcp` |
| [uk-income-tax-salary-mcp](https://github.com/theluckystrike/uk-income-tax-salary-mcp) | calculate_uk_take_home, get_uk_tax_bands, compare_salaries, marginal_rate_at_income | `https://uk-income-tax-salary-mcp.lipmichal.workers.dev/mcp` |
| [us-federal-holidays-business-days-mcp](https://github.com/theluckystrike/us-federal-holidays-business-days-mcp) | list_federal_holidays, is_business_day, add_business_days, count_business_days, invoice_due_date | `https://us-federal-holidays-business-days-mcp.lipmichal.workers.dev/mcp` |
| [ab-test-sample-size-calculator-mcp](https://github.com/theluckystrike/ab-test-sample-size-calculator-mcp) | calculate_sample_size, estimate_test_duration, test_ab_significance, fisher_exact_test, check_peeking_risk | `https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp` |
| [ap-score-distributions-mcp](https://github.com/theluckystrike/ap-score-distributions-mcp) | get_ap_score_distribution, estimate_ap_percentile, compare_ap_exams, list_ap_exams, estimate_ap_score_from_composite | `https://ap-score-distributions-mcp.lipmichal.workers.dev/mcp` |
| [car-loan-interest-deduction-calculator-mcp](https://github.com/theluckystrike/car-loan-interest-deduction-calculator-mcp) | calculate_car_loan_interest_deduction, calculate_salt_deduction, get_tax_brackets_and_standard_deduction, calculate_child_tax_credit | `https://car-loan-interest-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [estate-gift-tax-exemption-calculator-mcp](https://github.com/theluckystrike/estate-gift-tax-exemption-calculator-mcp) | get_exemption_amounts, calculate_estate_tax, check_gift, compare_years | `https://estate-gift-tax-exemption-calculator-mcp.lipmichal.workers.dev/mcp` |
| [recipe-nutrition-calculator-mcp](https://github.com/theluckystrike/recipe-nutrition-calculator-mcp) | lookup_ingredient_nutrition, calculate_recipe_nutrition, round_nutrition_label, scale_recipe_nutrition | `https://recipe-nutrition-calculator-mcp.lipmichal.workers.dev/mcp` |
| [retirement-contribution-limits-2027-mcp](https://github.com/theluckystrike/retirement-contribution-limits-2027-mcp) | get_contribution_limits, calculate_max_contribution, get_social_security_cola, compare_years | `https://retirement-contribution-limits-2027-mcp.lipmichal.workers.dev/mcp` |
| [section-179-deduction-calculator-mcp](https://github.com/theluckystrike/section-179-deduction-calculator-mcp) | calculate_section_179, calculate_bonus_depreciation, get_vehicle_depreciation_limits, calculate_asset_loan_payment | `https://section-179-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [student-loan-repayment-assistance-plan-calculator-mcp](https://github.com/theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp) | calculate_rap_payment, compare_rap_vs_standard, get_federal_loan_limits, get_plan_transition_dates | `https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [subdomain-finder-mcp](https://github.com/theluckystrike/subdomain-finder-mcp) | find_subdomains, resolve_subdomains, get_certificate_history, summarize_attack_surface | `https://subdomain-finder-mcp.lipmichal.workers.dev/mcp` |
| [uk-statutory-sick-pay-maternity-pay-calculator-mcp](https://github.com/theluckystrike/uk-statutory-sick-pay-maternity-pay-calculator-mcp) | calculate_statutory_sick_pay, calculate_statutory_maternity_pay, get_minimum_wage_rates, check_eligibility | `https://uk-statutory-sick-pay-maternity-pay-calculator-mcp.lipmichal.workers.dev/mcp` |

The paid back-office collection (invoices, VAT, PDFs, spreadsheets) is at https://mcp.zovo.one
<!-- data-servers:end -->
