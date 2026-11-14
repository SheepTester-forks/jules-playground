# TritonPay Statement Parser & Balance Verifier

Tooling for extracting and verifying UCSD TritonPay billing statements from PDF into a structured TSV file.

## Quick Start

```bash
cd tritonpay/

npm install

# Export statements to statements.tsv and verify all balances:
npm run export

# Generate verbatim/raw TSV (exact PDF string formatting):
npm run export -- --raw --output statements_raw.tsv

# Run the standalone verification suite:
npm run verify
```

## Available Scripts

- **`export-tsv.ts`** (`npm run export`):
  Parses all PDF statements from the statements directory (default `/mnt/c/Users/seant/Downloads/tritonpay statements`), verifies intra-statement and inter-statement balances, and writes tab-delimited records to `statements.tsv`.

  Options:
  - `--input <dir>`: Custom PDF statements directory
  - `--output <path>`: Custom output TSV path (default `./statements.tsv`)
  - `--raw` / `--verbatim`: Output verbatim strings directly from PDF (raw `MM/DD/YYYY` dates, dollar strings `$X,XXX.XX`, blank empty cells, omitting synthetic columns)
  - `--no-verify`: Skip balance verification

- **`verify-parse.ts`** (`npm run verify`):
  Comprehensive audit script testing:
  1. Statement-level integrity: $\sum \text{Charges} - \sum \text{Credits} = \text{Current Balance}$
  2. Total due equation: $\text{Previous Balance} + \text{Current Balance} = \text{Total Due}$
  3. Chronological continuity: $\text{Ending Balance}_N = \text{Starting Balance}_{N+1}$

- **`parser.ts`**:
  Core PDF parser module leveraging `pdf-parse` (pdfjs-dist under the hood) using coordinate-based text extraction.

- **`report.md`**:
  Full analytical report detailing PDF visual/coordinate structure, column provenance (verbatim vs normalized vs derived), balance audit log, and financial breakdown.

## TSV Output Schema

`statements.tsv` (gitignored per project instructions) contains:

- `Source Statement`: Name of the source PDF file
- `Statement Date`: Statement date (YYYY-MM-DD)
- `Due Date`: Due date (YYYY-MM-DD)
- `Date Posted`: Transaction posting date (YYYY-MM-DD)
- `Term`: Academic term verbatim (e.g. `Fall22`, `Winter24`, `Spring25`, or empty)
- `Description`: Item description verbatim
- `Charges`: Billed charges (or `0.00` in standard mode; `$X,XXX.XX` or blank in `--raw` mode)
- `Credits`: Credited payments/waivers (or `0.00` in standard mode; `$X,XXX.XX` or blank in `--raw` mode)
- `Amount`: Signed transaction amount (+ for charge, - for credit)
- `Running Balance`: Continuous cumulative account balance
