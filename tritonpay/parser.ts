import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

interface Tx {
  sourceStatement: string;
  statementDate: string;
  dueDate: string;
  datePosted: string;
  term: string;
  description: string;
  charge: number;
  credit: number;
  amount: number;
  runningBalance: number;
}

function parseCurrency(str: string): number {
  const clean = str.replace(/[$,\s]/g, '');
  return parseFloat(clean);
}

export async function parseAllStatements(dir: string): Promise<{ statements: any[]; transactions: Tx[] }> {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  const statements: any[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
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
    const txs: Omit<Tx, 'runningBalance'>[] = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = (tc.items as any[]).filter(it => it.str && it.str.trim());

      if (p === 1) {
        for (let i = 0; i < items.length; i++) {
          const str = items[i].str.trim();
          if (str === 'Statement Date' && items[i + 1]) {
            statementDate = items[i + 1].str.trim();
          } else if (str === 'Due Date') {
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
          }
        }
      }

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

          txs.push({
            sourceStatement: file,
            statementDate,
            dueDate,
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

    statements.push({
      file,
      statementDate,
      dueDate,
      studentId,
      studentName,
      previousBalance,
      currentBalance,
      totalDue,
      txs,
    });
  }

  // Sort statements chronologically
  statements.sort((a, b) => new Date(a.statementDate).getTime() - new Date(b.statementDate).getTime());

  // Flatten and calculate running balance
  const allTxs: Tx[] = [];
  let runningBalance = 0;
  for (const s of statements) {
    for (const tx of s.txs) {
      runningBalance = Math.round((runningBalance + tx.amount) * 100) / 100;
      allTxs.push({
        ...tx,
        runningBalance,
      });
    }
  }

  return { statements, transactions: allTxs };
}
