import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAllStatements } from './parser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ExportOptions {
  inputDir: string;
  outputFile: string;
  verify: boolean;
  raw: boolean;
}

function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);
  let inputDir = '/mnt/c/Users/seant/Downloads/tritonpay statements';
  let outputFile = path.join(__dirname, 'statements.tsv');
  let verify = true;
  let raw = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputDir = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[++i];
    } else if (args[i] === '--no-verify') {
      verify = false;
    } else if (args[i] === '--raw' || args[i] === '--verbatim') {
      raw = true;
    } else if (!args[i].startsWith('--')) {
      inputDir = args[i];
    }
  }

  return { inputDir, outputFile, verify, raw };
}

function formatCurrency(val: number): string {
  return (val < 0 ? '-$' : '$') + Math.abs(val).toFixed(2);
}

async function main() {
  const options = parseArgs();
  console.log(`Reading statements from: ${options.inputDir}`);
  console.log(`Writing TSV output to:   ${options.outputFile} (mode: ${options.raw ? 'raw/verbatim' : 'standard/normalized'})`);

  if (!fs.existsSync(options.inputDir)) {
    console.error(`Input directory does not exist: ${options.inputDir}`);
    process.exit(1);
  }

  const { statements, transactions } = await parseAllStatements(options.inputDir);
  console.log(`Successfully parsed ${statements.length} statement files and ${transactions.length} transactions.\n`);

  // Verify balances
  if (options.verify) {
    console.log('--- Verifying Balances ---');
    let allValid = true;

    // 1. Within statement
    for (const stmt of statements) {
      const sumCharges = stmt.txs.reduce((acc: number, t: any) => acc + t.charge, 0);
      const sumCredits = stmt.txs.reduce((acc: number, t: any) => acc + t.credit, 0);
      const calcCurr = Math.round((sumCharges - sumCredits) * 100) / 100;
      const calcTotal = Math.round((stmt.previousBalance + calcCurr) * 100) / 100;

      const currDiff = Math.abs(calcCurr - stmt.currentBalance);
      const totalDiff = Math.abs(calcTotal - stmt.totalDue);

      if (currDiff > 0.009 || totalDiff > 0.009) {
        allValid = false;
        console.error(`❌ Balance mismatch in ${stmt.file}:`);
        console.error(`   Charges: ${sumCharges.toFixed(2)}, Credits: ${sumCredits.toFixed(2)} => Calc Current: ${calcCurr.toFixed(2)} vs Stmt: ${stmt.currentBalance.toFixed(2)}`);
        console.error(`   Calc Total Due: ${calcTotal.toFixed(2)} vs Stmt: ${stmt.totalDue.toFixed(2)}`);
      } else {
        console.log(`✓ [${stmt.statementDate}] ${stmt.file}: Prev ${formatCurrency(stmt.previousBalance)} + Curr ${formatCurrency(stmt.currentBalance)} = Total ${formatCurrency(stmt.totalDue)}`);
      }
    }

    // 2. Across statements continuity
    console.log('\n--- Checking Continuity Across Statements ---');
    for (let i = 0; i < statements.length - 1; i++) {
      const curr = statements[i];
      const next = statements[i + 1];
      const diff = Math.abs(curr.totalDue - next.previousBalance);
      if (diff > 0.009) {
        allValid = false;
        console.error(`❌ Continuity gap between ${curr.statementDate} (${curr.file}) ending ${curr.totalDue.toFixed(2)} and ${next.statementDate} (${next.file}) starting ${next.previousBalance.toFixed(2)}`);
      } else {
        console.log(`✓ Continuity: ${curr.statementDate} ending ${formatCurrency(curr.totalDue)} == ${next.statementDate} starting ${formatCurrency(next.previousBalance)}`);
      }
    }

    // 3. Final running balance
    const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].runningBalance : 0;
    console.log(`\n--- Overall Ledger Balance ---`);
    console.log(`Total Statements:        ${statements.length}`);
    console.log(`Total Transactions:      ${transactions.length}`);
    console.log(`Initial Account Balance: $0.00`);
    console.log(`Final Running Balance:   ${formatCurrency(finalBalance)}`);

    if (Math.abs(finalBalance) > 0.009) {
      allValid = false;
      console.error(`❌ Final balance does not resolve to $0.00: ${finalBalance.toFixed(2)}`);
    } else {
      console.log(`✓ Final balance is exactly $0.00!`);
    }

    if (!allValid) {
      console.error('\nOne or more balance checks failed!');
      process.exit(1);
    }
  }

  // Generate TSV
  let headers: string[];
  const rows: string[] = [];

  if (options.raw) {
    // Verbatim columns as extracted from the PDF without transformations
    headers = [
      'Source Statement',
      // 'Statement Date',
      // 'Due Date',
      'Date Posted',
      'Term',
      'Description',
      'Charges',
      'Credits',
    ];
    rows.push(headers.join('\t'));

    for (const tx of transactions) {
      const row = [
        tx.sourceStatement,
        // tx.rawStatementDate,
        // tx.rawDueDate || tx.dueDate,
        tx.rawDatePosted,
        tx.term,
        tx.description,
        tx.rawCharge,
        tx.rawCredit,
      ];
      rows.push(row.join('\t'));
    }
  } else {
    // Standard normalized columns with numeric amounts and running balance
    headers = [
      'Source Statement',
      'Statement Date',
      'Due Date',
      'Date Posted',
      'Term',
      'Description',
      'Charges',
      'Credits',
      'Amount',
      'Running Balance',
    ];
    rows.push(headers.join('\t'));

    for (const tx of transactions) {
      const row = [
        tx.sourceStatement,
        tx.statementDate,
        tx.dueDate,
        tx.datePosted,
        tx.term,
        tx.description,
        tx.charge > 0 ? tx.charge.toFixed(2) : '0.00',
        tx.credit > 0 ? tx.credit.toFixed(2) : '0.00',
        tx.amount.toFixed(2),
        tx.runningBalance.toFixed(2),
      ];
      rows.push(row.join('\t'));
    }
  }

  fs.writeFileSync(options.outputFile, rows.join('\n') + '\n', 'utf-8');
  console.log(`\nSuccessfully wrote ${rows.length - 1} rows to ${options.outputFile}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
