# Pay Statements Parser, TSV Exporter & Math Verifier

Tools for parsing, exporting, and mathematically verifying pay statements from **University of California (UCPath)** and **TikTok Inc** into structured TSV files.

## Quick Start

```bash
cd pay-statements/

# Install dependencies
npm install

# Export all TSV files (uc.tsv, tiktok.tsv, and dedicated per-table files):
npm start
# or: node export-tsv.ts

# Run the complete mathematical and chronological continuity audit:
npm run verify
# or: node verify.ts
```

## Generated TSV Files

Per project rules, all TSV outputs contain private payroll data and are ignored by git (`pay-statements/.gitignore`).

### Main Consolidated Files (One per Employer):
1. **`uc.tsv`**: All tabular records across all 51 UC statements. Contains the source identifier column `Source Statement` (advice number with leading zeroes removed, e.g. `62179036`), table/section heading, and exact column headings from the PDF.
2. **`tiktok.tsv`**: All tabular records across all 10 TikTok statements. Contains the source identifier column `Source Statement` (PDF filename, e.g. `Payslip_2025-07-03.pdf`), table/section heading, and exact column headings from the PDF.

### Dedicated Per-Table TSV Files:
- **University of California**:
  - `uc_hours_and_earnings.tsv`: Hourly/salaried earnings components, pay rates, current hours, current earnings, YTD hours, and YTD earnings.
  - `uc_taxes.tsv`: Federal and California state tax withholdings.
  - `uc_before_tax_deductions.tsv`: Pre-tax deductions.
  - `uc_after_tax_deductions.tsv`: Post-tax union dues and initiation fees.
  - `uc_employer_benefits.tsv`: University-paid benefit contributions.
  - `uc_summary.tsv`: Total gross, federal taxable gross, OASDI gross, Medicare gross, CA state taxable gross, total tax, total deductions, and net pay.
  - `uc_net_pay_distribution.tsv`: Bank account types, masked numbers, and direct deposit amounts.
- **TikTok Inc**:
  - `tiktok_earnings.tsv`: Hourly wage components, pay rates, hours/units, and amounts.
  - `tiktok_tax_deductions.tsv`: Federal and California tax withholdings.
  - `tiktok_additional_deductions.tsv`: Wire offsets and special deductions.
  - `tiktok_other_benefits.tsv`: Transportation, ByteMall Points, and fitness fringe benefits.
  - `tiktok_quota_summary.tsv`: Sick leave (PSL) and paid time off (PTO) accruals and balances.
  - `tiktok_summary.tsv`: Gross pay, net pay, total work hours, and federal taxable wages.
  - `tiktok_deposit_stub.tsv`: Bank transfer disbursement accounts and check stub details.

## Reconciliation & Completeness Audit

Run `npm run verify` to test:
1. **Internal Mathematical Reconciliation**:
   - $\sum \text{Earnings Items} = \text{Gross Pay}$
   - $\sum \text{Taxes} = \text{Total Taxes}$
   - $\sum \text{Deductions} = \text{Total Deductions}$
   - $\text{Net Pay} = \text{Gross Pay} - \text{Total Taxes} - \text{Total Deductions}$
   - $\sum \text{Direct Deposits} = \text{Net Pay}$
2. **YTD Chronological Accumulation**:
   - For consecutive statements within each calendar year:
     $$\text{YTD}_{S_n} = \text{YTD}_{S_{n-1}} + \text{Current}_{S_n}$$
   - Zero discrepancy indicates no pay statements are missing.

### Audit Result:
- **University of California**: 51 statements spanning May 15, 2022 to June 30, 2025. **100% complete (0 missing)**.
- **TikTok Inc**: 10 statements spanning June 23, 2025 to January 16, 2026. **100% complete (0 missing)**.

## Project Structure & Documentation

- `report.md`: Committed report detailing PDF structure, column provenance, and verification audit without sensitive figures.
- `report-with-dollars.md`: Gitignored report containing exact monetary values and annual breakdowns.
- `export-tsv.ts`: Exports all statements into TSV files.
- `verify.ts`: Runs mathematical reconciliation and missing-document detection.
- `test-uc-parser.ts` & `test-tiktok-parser.ts`: Coordinate-based PDF parsers.
