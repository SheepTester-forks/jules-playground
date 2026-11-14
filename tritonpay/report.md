# UCSD TritonPay Statements Parser & Balance Audit Report

## 1. Executive Summary

This report documents the parsing, conversion, and mathematical verification of **21 UCSD TritonPay billing statement PDFs** spanning from **September 2022 to July 2025**. 

The statements were parsed into a structured, tab-separated values (TSV) dataset saved to `statements.tsv`. In accordance with user instructions, `statements.tsv` is gitignored (`tritonpay/.gitignore`).

### Key Highlights:
- **Total Statements Parsed:** 21 PDF files
- **Total Ledger Transactions Extracted:** 147 line items
- **Total Charges Billed:** $[REMOVED]
- **Total Credits / Payments / Waivers:** $[REMOVED]
- **Net Account Balance:** **$[REMOVED]**
- **Statement Balance Verification:** **100% Passed** (every statement's charges and credits match its reported current balance and total due down to the exact cent)
- **Chronological Balance Continuity:** **100% Passed** (every consecutive statement's starting previous balance matches the preceding statement's ending total due)
- **Continuous Ledger Audit:** **100% Passed** (cumulative running balance initialized at $[REMOVED] on 2022-08-23 terminates at exactly $[REMOVED] on 2025-07-01)

---

## 2. Dataset Schema & TSV Format

The generated TSV file (`statements.tsv`) contains the following columns:

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `Source Statement` | string | Filename of the source statement PDF | `UCSD Statement  01_19_2024-010424.pdf` |
| `Statement Date` | ISO Date (YYYY-MM-DD) | Date the billing statement was issued | `2024-01-03` |
| `Due Date` | ISO Date (YYYY-MM-DD) | Payment due date | `2024-01-19` |
| `Date Posted` | ISO Date (YYYY-MM-DD) | Transaction posting date | `2023-12-13` |
| `Term` | string | Academic term (or blank if unassigned) | `Winter24` |
| `Description` | string | Full transaction description | `E-Check Payment T10315701` |
| `Charges` | numeric (2 decimals) | Billed debit amount (or [REMOVED] if credit) | `[REMOVED]` |
| `Credits` | numeric (2 decimals) | Credit / payment / waiver amount (or [REMOVED] if charge) | `[REMOVED]` |
| `Amount` | numeric (2 decimals) | Signed transaction amount (+ for charge, - for credit) | `-[REMOVED]` |
| `Running Balance` | numeric (2 decimals) | Cumulative account balance after this transaction | `[REMOVED]` |

---

## 3. Implementation Details

### Architecture & Extraction Methodology
The parser was implemented in TypeScript (`parser.ts`, `export-tsv.ts`, `verify-parse.ts`) and runs directly on Node.js 26+ without transpilation (`node script.ts`).

1. **PDF Tokenization & Geometry Awareness:**
   UCSD TritonPay statements use tabular layouts where the column header defines the coordinate boundaries:
   - `Date Posted`: centered around horizontal coordinate $x \approx 87.3$
   - `Term`: horizontal coordinate $x \approx 157.9$
   - `Description`: spans $x \in [220, 450)$
   - `Charges`: right-aligned numbers with $x \in [460, 505)$
   - `Credits`: right-aligned numbers with $x \ge 510$
   
   Relying on positional coordinates ensures that charges and credits are never conflated, even when descriptions wrap or terms are omitted (such as electronic payments or campus fee reversals).

2. **Multi-Page Handling:**
   While most statements are 2 pages (Page 1 = Details + Summary, Page 2 = Billing Instructions), multi-page statements such as `UCSD Statement  Historical Bill Import-09_23_2022-122023.pdf` span 3 pages. The parser processes transaction tables across all continuation pages before the footer and totals.

3. **Numeric Robustness:**
   Amounts are formatted as `[REMOVED]` rather than blank strings to prevent `ValueError` in Python `float()` conversions or `NaN` in JavaScript arithmetic, while the signed `Amount` column simplifies ledger aggregation.

---

## 4. Statement-by-Statement Balance Audit

Every statement was verified against two strict accounting equations:
1. **Intrastatement Current Activity Balance:**
   $$\sum \text{Charges} - \sum \text{Credits} = \text{Current Account Balance}$$
2. **Intrastatement Total Due:**
   $$\text{Previous Account Balance} + \text{Current Account Balance} = \text{TOTAL DUE}$$
3. **Interstatement Continuity:**
   $$\text{TOTAL DUE}_{N} = \text{Previous Account Balance}_{N+1}$$

### Full Statement Audit Log:

| # | Statement Date | Due Date | Source File | Previous Balance | Charges | Credits | Current Activity | Total Due | Status |
| :-: | :-: | :-: | :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | 2022-09-07 | 2022-09-23 | `Historical Bill Import-09_23_2022-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 2 | 2022-10-03 | 2022-10-21 | `Historical Bill Import-10_21_2022-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | $[REMOVED] | **PASS** |
| 3 | 2022-12-01 | 2022-12-16 | `Historical Bill Import-12_16_2022-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 4 | 2023-01-03 | 2023-01-20 | `Historical Bill Import-01_20_2023-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | $[REMOVED] | **PASS** |
| 5 | 2023-03-01 | 2023-03-24 | `Historical Bill Import-03_24_2023-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 6 | 2023-04-03 | 2023-04-21 | `Historical Bill Import-04_21_2023-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | $[REMOVED] | **PASS** |
| 7 | 2023-09-05 | 2023-09-25 | `09_25_2023-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 8 | 2023-10-02 | 2023-10-20 | `10_20_2023-122023.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | $[REMOVED] | **PASS** |
| 9 | 2023-12-01 | 2023-12-15 | `12_15_2023-122123.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 10 | 2024-01-03 | 2024-01-19 | `01_19_2024-010424.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | $[REMOVED] | **PASS** |
| 11 | 2024-03-04 | 2024-03-22 | `03_22_2024-030524.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 12 | 2024-04-02 | 2024-04-19 | `04_19_2024-041524.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | $[REMOVED] | **PASS** |
| 13 | 2024-09-04 | 2024-09-20 | `09_20_2024-090524.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 14 | 2024-10-01 | 2024-10-18 | `10_18_2024-100224.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | -$[REMOVED] | **PASS** |
| 15 | 2024-11-01 | 2024-11-15 | `11_15_2024-110224.pdf` | -$[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | -$[REMOVED] | **PASS** |
| 16 | 2024-12-02 | 2024-12-20 | `12_20_2024-120324.pdf` | -$[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | -$[REMOVED] | **PASS** |
| 17 | 2025-01-02 | 2025-01-24 | `01_24_2025-010325.pdf` | -$[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | **PASS** |
| 18 | 2025-02-04 | 2025-02-21 | `02_21_2025-020525.pdf` | -$[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | **PASS** |
| 19 | 2025-03-04 | 2025-03-21 | `03_21_2025-030525.pdf` | -$[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |
| 20 | 2025-04-01 | 2025-04-18 | `04_18_2025-040225.pdf` | $[REMOVED] | $[REMOVED] | $[REMOVED] | -$[REMOVED] | -$[REMOVED] | **PASS** |
| 21 | 2025-07-01 | 2025-07-28 | `07_28_2025-070225.pdf` | -$[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | $[REMOVED] | **PASS** |

---

## 5. Overall Financial Breakdown

Across all 147 transactions, the funds categorize into the following major components:

| Category | Total Billed / Credited | Description / Examples |
| :--- | :--- | :--- |
| **Total Billed Charges** | **$[REMOVED]** | All university fees, room & board, tuition, and overpayment refunds |
| • *Tuition & Supplemental* | $[REMOVED] | Fall, Winter, Spring tuition + NonResident Supplemental Tuition |
| • *Housing & Dining* | $[REMOVED] | Full-year residence hall single/double rooms & dining plans |
| • *Mandatory Health Insurance* | $[REMOVED] | USHIP undergraduate & graduate health insurance charges |
| • *Campus & Student Services Fees* | $[REMOVED] | RIMAC, Campus Activity, ICA, Canyonview, Student Services, Transport |
| • *Overpayment Refund* | $[REMOVED] | Refund of cash/check overpayment issued 2025-01-15 |
| • *Administrative & Other Charges* | $[REMOVED] | Tech fees, ID reprint ($25), WEPA printing ($[REMOVED]), lab fee ($10) |
| **Total Credits & Payments** | **$[REMOVED]** | All payments, health fee waivers, fee remissions, and adjustments |
| • *Direct Payments (E-Check)* | $[REMOVED] | Direct bank payments from student / payer |
| • *Health Insurance Waivers* | $[REMOVED] | Full offset of USHIP / graduate health insurance fees |
| • *Tuition & Fee Remissions* | $[REMOVED] | Graduate student fee remissions (RTF/F and HI/H) |
| • *Housing Adjustments & Deposits* | $[REMOVED] | Room adjustments (double vs single swaps) and deposit credits |
| **Net Final Balance** | **$[REMOVED]** | **Exact match down to the cent ($[REMOVED])** |

---

## 6. How to Reproduce and Verify

From the repository root:

```bash
# 1. Regenerate statements.tsv
cd tritonpay
npm run export

# 2. Run the automated verification suite
npm run verify
```

Both scripts exit with code `0` on successful balance verification, and non-zero if any calculation discrepancy occurs.
