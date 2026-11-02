// GET / page for the hosted Worker.
const TOOLS = [
    ["get_federal_poverty_level", "Federal poverty line for ACA coverage years 2025-2027 (48 states and DC, Alaska, Hawaii) with the 100% to 400% thresholds."],
    ["calculate_premium_tax_credit", "Premium tax credit for 2025 (enhanced rules) or 2026 (Rev. Proc. 2025-25 table, 400% FPL limit), the Form 8962 way."],
    ["check_subsidy_cliff", "Dollar effect of the 400% FPL cliff for 2026 coverage, and the income cut needed to get back under it."],
    ["get_aptc_repayment_cap", "Excess APTC repayment caps for 2025, and no cap from 2026 (P.L. 119-21 sec. 71305)."],
];
function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function landingPage(origin) {
    const mcp = `${origin}/mcp`;
    const rows = TOOLS.map(([n, d]) => `<tr><td><code>${n}</code></td><td>${esc(d)}</td></tr>`).join("");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ACA Premium Tax Credit Calculator MCP</title>
<meta name="description" content="MCP server for the 2026 ACA premium tax credit: enhanced subsidies expired, 400% FPL cliff, Rev. Proc. 2025-25 table, poverty guidelines and repayment caps.">
<style>:root{--bg:#fff;--fg:#1a1a1a;--muted:#555;--line:#ddd;--code:#f4f4f4}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--muted:#aaa;--line:#333;--code:#222}}
body{background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px 16px}
code,pre{background:var(--code);border-radius:4px;font-size:14px}pre{padding:10px;overflow-x:auto}code{padding:1px 4px}
table{border-collapse:collapse;width:100%}td{border-top:1px solid var(--line);padding:8px 6px;vertical-align:top}p.small{color:var(--muted);font-size:14px}a{color:inherit}</style></head>
<body><h1>ACA premium tax credit calculator MCP server</h1>
<p>Gives an AI assistant the 2026 Obamacare subsidy rules that are newer than its training data. The enhanced premium tax credits ended after 2025, so for 2026 coverage the 400% federal poverty line cliff is back, the IRS table runs from 2.10% to 9.96% of income (Rev. Proc. 2025-25), and excess advance credit is repaid in full with no cap (P.L. 119-21 sec. 71305). Every number is copied from IRS, Federal Register and congress.gov sources.</p>
<h2>Connect</h2>
<p>Hosted endpoint (Streamable HTTP, no sign-in, no token). Paste it into Claude.ai custom connectors or ChatGPT developer mode.</p>
<pre>${esc(mcp)}</pre>
<p>Claude Code</p><pre>claude mcp add --transport http aca-premium-tax-credit ${esc(mcp)}</pre>
<p>Local (stdio)</p><pre>npx -y github:theluckystrike/aca-premium-tax-credit-calculator-mcp</pre>
<h2>Tools</h2><table>${rows}</table>
<p>Lower your MAGI with an HSA: <a href="https://taxbreakcalc.com/hsa-calculator/?utm_source=mcp&amp;utm_medium=aca-premium-tax-credit-calculator-mcp">taxbreakcalc.com HSA calculator</a>.
Source: <a href="https://github.com/theluckystrike/aca-premium-tax-credit-calculator-mcp">github.com/theluckystrike/aca-premium-tax-credit-calculator-mcp</a>.</p>
<p class="small">General information, not tax advice. Part of the Zovo MCP collection: <a href="https://mcp.zovo.one">mcp.zovo.one</a>.</p>
</body></html>`;
}
