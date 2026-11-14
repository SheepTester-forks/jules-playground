import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

interface Transaction {
  sourceStatement: string;
  statementDate: string;
  dueDate: string;
  studentId: string;
  studentName: string;
  datePosted: string;
  term: string;
  description: string;
  charge: number;
  credit: number;
  amount: number; // positive for charge, negative for credit
}

interface Statement {
  file: string;
  statementDate: string;
  dueDate: string;
  studentId: string;
  studentName: string;
  previousBalance: number;
  currentBalance: number;
  totalDue: number;
  transactions: Transaction[];
}

function parseCurrency(str: string): number {
  const clean = str.replace(/[$,\s]/g, '');
  return parseFloat(clean);
}

function formatCurrency(num: number): string {
  return (num < 0 ? '-$' : '$') + Math.abs(num).toFixed(2);
}

async function parseStatement(filePath: string): Promise<Statement> {
  const file = path.basename(filePath);
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const doc = await parser.load();

  let statementDate = '';
  let dueDate = '';
  let studentId = '';
  let studentName = '';
  let previousBalance = 0;
  let currentBalance = 0;
  let totalDue = 0;

  const transactions: Transaction[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = (tc.items as any[]).filter(it => it.str && it.str.trim());

    // Extract headers / metadata if on page 1
    if (p === 1) {
      for (let i = 0; i < items.length; i++) {
        const str = items[i].str.trim();
        if (str === 'Statement Date' && items[i + 1]) {
          statementDate = items[i + 1].str.trim();
        } else if (str === 'Due Date') {
          // Look ahead for the date
          for (let j = i + 1; j < Math.min(i + 4, items.length); j++) {
            const m = items[j].str.match(/\d{2}\/\d{2}\/\d{4}/);
            if (m) {
              dueDate = m[0];
              break;
            }
          }
        } else if (str === 'Student ID (PID)' && items[i + 1]) {
          studentId = items[i + 1].str.trim();
        } else if (str === 'Previous Account Balance' && items[i + 1]) {
          previousBalance = parseCurrency(items[i + 1].str);
        } else if (str === 'Current Account Balance' && items[i + 1]) {
          currentBalance = parseCurrency(items[i + 1].str);
        } else if (str === 'TOTAL DUE' && items[i + 1]) {
          totalDue = parseCurrency(items[i + 1].str);
        } else if (str.startsWith('Name:')) {
          studentName = str.replace('Name:', '').trim();
        }
      }
      if (!studentName) {
        // Look for "Yen, Sean" or similar
        const nameItem = items.find(it => it.transform[4] < 100 && it.transform[5] > 600 && it.str.includes('Yen'));
        if (nameItem) studentName = nameItem.str.trim();
      }
    }

    // Now extract transactions
    // Group items by y coordinate
    const rowsByY: { y: number; items: any[] }[] = [];
    for (const it of items) {
      const y = it.transform[5];
      let row = rowsByY.find(r => Math.abs(r.y - y) < 3);
      if (!row) {
        row = { y, items: [] };
        rowsByY.push(row);
      }
      row.items.push(it);
    }
    // Sort rows top-to-bottom
    rowsByY.sort((a, b) => b.y - a.y);

    for (const row of rowsByY) {
      row.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const first = row.items[0];
      if (first && Math.abs(first.transform[4] - 87.3) < 10 && /^\d{2}\/\d{2}\/\d{4}$/.test(first.str)) {
        const datePosted = first.str.trim();
        let term = '';
        const descParts: string[] = [];
        let charge = 0;
        let credit = 0;

        for (let idx = 1; idx < row.items.length; idx++) {
          const it = row.items[idx];
          const x = it.transform[4];
          const s = it.str.trim();

          if (x < 200 && idx === 1 && !s.startsWith('$')) {
            term = s;
          } else if (x < 450) {
            descParts.push(s);
          } else if (x >= 450 && x < 510) {
            charge = parseCurrency(s);
          } else if (x >= 510) {
            credit = parseCurrency(s);
          }
        }

        const description = descParts.join(' ');
        const amount = charge > 0 ? charge : -credit;

        transactions.push({
          sourceStatement: file,
          statementDate,
          dueDate,
          studentId,
          studentName,
          datePosted,
          term,
          description,
          charge,
          credit,
          amount,
        });
      }
    }
  }

  await parser.destroy();

  return {
    file,
    statementDate,
    dueDate,
    studentId,
    studentName,
    previousBalance,
    currentBalance,
    totalDue,
    transactions,
  };
}

async function main() {
  const dir = '/mnt/c/Users/seant/Downloads/tritonpay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  const statements: Statement[] = [];
  for (const f of files) {
    const s = await parseStatement(path.join(dir, f));
    statements.push(s);
  }

  // Sort chronologically by statementDate
  statements.sort((a, b) => new Date(a.statementDate).getTime() - new Date(b.statementDate).getTime());

  console.log(`Parsed ${statements.length} statements.`);

  let allChecksPassed = true;

  console.log('\n=== STATEMENT-LEVEL CHECKS ===');
  for (const s of statements) {
    const sumCharges = s.transactions.reduce((acc, t) => acc + t.charge, 0);
    const sumCredits = s.transactions.reduce((acc, t) => acc + t.credit, 0);
    const calcCurrentBalance = Math.round((sumCharges - sumCredits) * 100) / 100;
    const calcTotalDue = Math.round((s.previousBalance + calcCurrentBalance) * 100) / 100;

    const currDiff = Math.abs(calcCurrentBalance - s.currentBalance);
    const totalDiff = Math.abs(calcTotalDue - s.totalDue);

    const currOk = currDiff < 0.009;
    const totalOk = totalDiff < 0.009;

    if (!currOk || !totalOk) {
      allChecksPassed = false;
      console.error(`FAIL in ${s.file}:`);
      console.error(`  Stmt Date: ${s.statementDate}, Due Date: ${s.dueDate}`);
      console.error(`  Parsed Prev Balance: ${s.previousBalance}`);
      console.error(`  Sum Charges: ${sumCharges.toFixed(2)}, Sum Credits: ${sumCredits.toFixed(2)}`);
      console.error(`  Calc Curr Balance: ${calcCurrentBalance.toFixed(2)} vs Stmt: ${s.currentBalance.toFixed(2)} (ok=${currOk})`);
      console.error(`  Calc Total Due: ${calcTotalDue.toFixed(2)} vs Stmt: ${s.totalDue.toFixed(2)} (ok=${totalOk})`);
    } else {
      console.log(`PASS [${s.statementDate}] ${s.file.padEnd(55)}: Prev=${formatCurrency(s.previousBalance).padStart(11)} + Curr=${formatCurrency(s.currentBalance).padStart(11)} = Total=${formatCurrency(s.totalDue).padStart(11)} (${s.transactions.length} txs)`);
    }
  }

  console.log('\n=== CHRONOLOGICAL BALANCE CONTINUITY CHECKS ===');
  for (let i = 0; i < statements.length - 1; i++) {
    const curr = statements[i];
    const next = statements[i + 1];
    const diff = Math.abs(curr.totalDue - next.previousBalance);
    const ok = diff < 0.009;
    if (!ok) {
      console.warn(`WARNING: Balance gap between ${curr.statementDate} (${curr.file}) ending at ${curr.totalDue} and ${next.statementDate} (${next.file}) starting at ${next.previousBalance}! Diff=${diff.toFixed(2)}`);
    } else {
      console.log(`PASS: [${curr.statementDate} -> ${next.statementDate}] Ending ${formatCurrency(curr.totalDue)} == Starting ${formatCurrency(next.previousBalance)}`);
    }
  }

  console.log(`\nAll checks passed: ${allChecksPassed}`);
}

main().catch(console.error);
