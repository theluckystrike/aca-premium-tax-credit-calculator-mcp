# Data sources

Every number in `src/core.ts` was copied from these sources, fetched on 2026-11-02.

| Data | Source | Fetched |
| --- | --- | --- |
| 2026 applicable percentage table (2.10%, 3.14-4.19%, 4.19-6.60%, 6.60-8.44%, 8.44-9.96%, 9.96%) and 2026 required contribution percentage 9.96% | IRS Rev. Proc. 2025-25, sec. 3.01 and 3.02: https://www.irs.gov/pub/irs-drop/rp-25-25.pdf | 2026-11-02 |
| Enhanced credits limited to tax years 2021-2025 (Q7, updated Feb. 19, 2026); no repayment cap for tax years after 2025 (Q1, Q31); required contribution percentages 2025 9.02% and 2026 9.96% (Q12 list) | IRS Questions and answers on the Premium Tax Credit: https://www.irs.gov/affordable-care-act/individuals-and-families/questions-and-answers-on-the-premium-tax-credit | 2026-11-02 |
| 2025 applicable figure Table 2 (0.0000 at 150 or less to 0.0850 at 400 or more), Table 1-1 2024 poverty lines for 2025, Table 5 repayment limitation ($375/$750, $975/$1,950, $1,625/$3,250), Form 8962 line 5 and line 7 method | IRS Instructions for Form 8962 (2025): https://www.irs.gov/instructions/i8962 | 2026-11-02 |
| 2025 HHS poverty guidelines (used for 2026 coverage), 48 states and DC, Alaska, Hawaii | Federal Register 2025-01377, Jan. 17, 2025: https://www.federalregister.gov/documents/full_text/text/2025/01/17/2025-01377.txt | 2026-11-02 |
| 2024 HHS poverty guidelines (used for 2025 coverage) | Federal Register 2024-00796, Jan. 17, 2024: https://www.federalregister.gov/documents/full_text/text/2024/01/17/2024-00796.txt | 2026-11-02 |
| 2026 HHS poverty guidelines (used for 2027 coverage) | Federal Register 2026-00755, Jan. 15, 2026: https://www.federalregister.gov/documents/full_text/text/2026/01/15/2026-00755.txt | 2026-11-02 |
| Repeal of the excess APTC repayment limitation, effective for taxable years beginning after Dec. 31, 2025 | P.L. 119-21 (H.R. 1, One Big Beautiful Bill Act) sec. 71305, enrolled text: https://www.congress.gov/119/bills/hr1/BILLS-119hr1enr.htm | 2026-11-02 |
| No extension of the enhanced credits enacted | Congress.gov API list of 119th Congress public laws (138 laws, latest P.L. 119-136 on 2026-10-22): https://api.congress.gov/v3/law/119 . Enrolled texts of H.R. 7148 (Consolidated Appropriations Act, 2026, P.L. 119-75), H.R. 6500 (Continuing Appropriations and Extensions Act, 2027, P.L. 119-103), H.R. 7147 (P.L. 119-86) and H.R. 6938 (P.L. 119-74) contain no "36B", "premium tax credit" or "applicable percentage" text. Positive control: H.R. 1 enrolled text has 20 "36B" matches. | 2026-11-02 |

Not used: aspe.hhs.gov and healthcare.gov returned HTTP 403 to the fetch on 2026-11-02, so the HHS guidelines come from the same notices in the Federal Register.

Not confirmed, so not used: the 2027 applicable percentage table and 2027 required contribution percentage.
