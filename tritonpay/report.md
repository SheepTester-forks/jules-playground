# UCSD TritonPay Statements Parser & Balance Audit Report

## 1. Executive Summary

This report documents the parsing, structural analysis, and mathematical verification of **21 UCSD TritonPay billing statement PDFs** spanning from **September 2022 to July 2025**. 

The statements were parsed into a structured, tab-separated values (TSV) dataset saved to `statements.tsv` (and optional raw TSV `statements_raw.tsv`). In accordance with project instructions, all generated TSV files are gitignored (`tritonpay/.gitignore`).

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

## 2. Column Provenance: Verbatim vs. Normalized vs. Derived

Except for `Source Statement`, the columns in the TSV originate from the PDF statement elements as follows:

| TSV Column | Source in PDF | Classification | Transformation Details |
| :--- | :--- | :--- | :--- |
| `Source Statement` | N/A (Filename) | **Derived / Added** | Injected filename per prompt instructions (e.g. `UCSD Statement  01_19_2024-010424.pdf`). |
| `Statement Date` | `STATEMENT SUMMARY` box & Page Footer | **Normalized** | Formatted as `MM/DD/YYYY` in the PDF (e.g., `01/03/2024`). Normalized to ISO `YYYY-MM-DD` (`2024-01-03`) in default mode, or left verbatim in `--raw` mode. |
| `Due Date` | `STATEMENT SUMMARY` box | **Normalized** | Formatted as `MM/DD/YYYY` (or prefixed with `Historical Bill Import-01/20/2023`). Stripped of prefix and normalized to ISO `YYYY-MM-DD` (`2024-01-19`) in default mode, or left verbatim in `--raw` mode. |
| `Date Posted` | `Statement Details` table row | **Normalized** | Formatted as `MM/DD/YYYY` in the PDF (e.g., `12/13/2023`). Normalized to ISO `YYYY-MM-DD` (`2023-12-13`) in default mode, or left verbatim in `--raw` mode. |
| `Term` | `Statement Details` table row | **VERBATIM** | Exact string from the PDF's `Term` column (e.g. `Fall24`, `Winter25`, `Spring23`). Empty string `""` when omitted in the PDF (e.g., electronic check payments or general fee adjustments). |
| `Description` | `Statement Details` table row | **VERBATIM** | Exact string from the PDF's `Description` column (e.g., `E-Check Payment T10315701`, `TUITION FALL`, `GRAD HEALTH INS FEE WAIVER`). |
| `Charges` | `Statement Details` table row | **Normalized** | In the PDF, charges appear as right-aligned dollar strings with symbols and commas (e.g., `$[REMOVED]`). Credit rows have a blank cell under Charges. Normalized to 2-decimal numeric float (`[REMOVED]`, or `[REMOVED]` if blank) to prevent script errors. Preserved as raw `$X,XXX.XX` or blank cell in `--raw` mode. |
| `Credits` | `Statement Details` table row | **Normalized** | In the PDF, credits appear as right-aligned dollar strings with symbols and commas (e.g., `$[REMOVED]`). Charge rows have a blank cell under Credits. Normalized to 2-decimal numeric float (`[REMOVED]`, or `[REMOVED]` if blank). Preserved as raw `$X,XXX.XX` or blank cell in `--raw` mode. |
| `Amount` | Computed from Charges & Credits | **Derived / Synthetic** | **Not present in the PDF table.** Calculated as $+\text{Charges} - \text{Credits}$ to provide a unified signed net ledger value. Omitted in `--raw` mode. |
| `Running Balance` | Computed from Cumulative Ledger | **Derived / Synthetic** | **Not present in the PDF table.** Cumulative account balance calculated transaction-by-transaction across all 21 statements. Omitted in `--raw` mode. |

---

## 3. PDF Statement Visual & Physical Structure

Each UCSD TritonPay statement PDF conforms to a standardized multi-section layout. Below is the structural layout map:

### Page 1 Layout Schematic

```
+---------------------------------------------------------------------------------------------------------+
| [INSTITUTION & STUDENT HEADER]                          [STATEMENT SUMMARY BOX]                         |
| UC San Diego                                            STATEMENT SUMMARY                               |
| Student Financial Solutions                             Statement Date       01/03/2024                 |
| 9500 Gilman Drive                                       Due Date             01/19/2024                 |
| La Jolla, CA 92093-0026                                 Student ID (PID)     A16948219                  |
| sfs.ucsd.edu 858-822-4727                               Previous Account Balance  $[REMOVED]            |
|                                                         Current Account Balance  -$[REMOVED]            |
| Yen, Sean                                               TOTAL DUE                 $[REMOVED]                 |
|                                                                                                         |
| Total Amount Due                  $[REMOVED]                 [REMITTANCE ADDRESS BOX]                        |
|                                                         Make checks payable to: UC Regents              |
|                                                         and mail with top portion of your bill to:      |
|                                                         UC San Diego Cashier's Office                   |
|                                                         Attn: TritonPay Payment                         |
|                                                         9500 Gilman Drive, 0009                         |
|                                                         La Jolla, CA 92093-0009                         |
+---------------------------------------------------------------------------------------------------------+
| [IMPORTANT NOTICE BANNER]                                                                               |
| IMPORTANT MESSAGE                                                                                       |
| AMOUNTS SHOWN IN THIS BILL REPRESENT FEES AS CURRENTLY APPROVED FOR THIS ACADEMIC YEAR. HOWEVER, ALL    |
| UNIVERSITY FEES ARE SUBJECT TO CHANGE AND THE FEE AMOUNTS BILLED FOR THIS PERIOD MAY BE ADJUSTED...     |
+---------------------------------------------------------------------------------------------------------+
| [STATEMENT DETAILS TABLE]                                                                               |
| Statement Details                                                                                       |
| Date Posted      Term        Description                                    Charges          Credits    |
| ------------------------------------------------------------------------------------------------------- |
| PREVIOUS ACCOUNT BALANCE                                                  $[REMOVED]                     |
| Current Activity                                                                                        |
| 12/13/2023                   E-Check Payment T10315701                                     $[REMOVED]    |
| 12/13/2023                   E-Check Payment T10315702                                        $[REMOVED]    |
| CURRENT ACCOUNT BALANCE                                                  -$[REMOVED]                     |
+---------------------------------------------------------------------------------------------------------+
| [PAGE FOOTER]                                                                                           |
| Name: Yen, Sean                   Student ID: A16948219                   Statement Date: 01/03/2024    |
|                                         -- 1 of 2 --                                                    |
+---------------------------------------------------------------------------------------------------------+
```

### Table Coordinate Layout & Column Segmentation

In PDF points ($72 \text{ pt} = 1 \text{ in}$, coordinate origin $(0,0)$ at bottom-left corner of the page):

| Table Column | Label Position $(x)$ | Value Range $(x)$ | Alignment | Extraction Rule |
| :--- | :---: | :---: | :---: | :--- |
| **Date Posted** | $x \approx 87.3$ | $x \in [80, 110]$ | Left | Matches regex `^\d{2}/\d{2}/\d{4}$`. Marks beginning of transaction row. |
| **Term** | $x \approx 157.9$ | $x \in [145, 180]$ | Left | Token immediately following Date Posted if before $x = 200$. Empty if none. |
| **Description** | $x \approx 225.9$ | $x \in [220, 450)$ | Left | All text elements between $x=200$ and $x=450$. |
| **Charges** | $x \approx 463.5$ | $x \in [460, 505)$ | Right | Number string right-aligned around $x \approx 500$ (e.g. starts $465.0 - 480.9$). |
| **Credits** | $x \approx 516.1$ | $x \ge 510$ | Right | Number string right-aligned around $x \approx 550$ (e.g. starts $514.2 - 534.7$). |

### Special Rows in the Table:
1. **`PREVIOUS ACCOUNT BALANCE`**: Positioned directly under column headers at $y \approx 418.6$, with amount in the Charges/Balance column.
2. **`Current Activity`**: Section header separating previous balance from new line items at $y \approx 400.3$.
3. **`CURRENT ACCOUNT BALANCE`**: Positioned directly below the transaction rows, indicating the net sum of current activity ($\text{Charges} - \text{Credits}$).

### Multi-Page Structure & Continuation Rules:
- **Standard 2-Page Statements (20 of 21 files):**
  - **Page 1:** Full billing statement (Header, Statement Summary, Details Table, Current Activity, Total Due, and Footer).
  - **Page 2:** Static billing instructions and institutional explanations (`BILLING STATEMENT INSTRUCTIONS`, `EXPLANATION OF STATEMENT`, `IMPORTANT ACCOUNT INFORMATION`, `BILLING STATEMENT INQUIRIES`, `LEAVE OF ABSENCE / WITHDRAWAL POLICY`).
- **3-Page Statements (e.g. `Historical Bill Import-09_23_2022-122023.pdf`):**
  - **Page 1:** Header, Statement Summary, Details Table with initial 21 transactions down to $y \approx 52$.
  - **Page 2:** Continues transaction table from top of page ($y \approx 767$) with remaining 7 transactions, followed by `CURRENT ACCOUNT BALANCE`, `Total Amount Due`, and footer.
  - **Page 3:** Static billing instructions and explanations.

---

## 4. Statement-by-Statement Balance Audit

Every statement was verified against three strict accounting equations:
1. **Intrastatement Current Activity Balance:**
   $$\sum \text{Charges} - \sum \text{Credits} = \text{Current Account Balance}$$
2. **Intrastatement Total Due:**
   $$\text{Previous Account Balance} + \text{Current Account Balance} = \text{TOTAL DUE}$$
3. **Interstatement Chronological Continuity:**
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
cd tritonpay

# 1. Regenerate standard normalized TSV (statements.tsv):
npm run export

# 2. Or generate verbatim/raw TSV (statements_raw.tsv):
npm run export -- --raw --output statements_raw.tsv

# 3. Run the automated verification suite:
npm run verify
```

Both scripts exit with code `0` on successful balance verification, and non-zero if any calculation discrepancy occurs.
