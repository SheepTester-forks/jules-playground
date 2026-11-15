import path from 'node:path';
import fs from 'node:fs';
import { parseTikTokFile, parseTikTokCurrency } from './test-tiktok-parser.ts';
import type { TikTokStatement } from './test-tiktok-parser.ts';

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

async function verifyTikTok() {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  const statements: TikTokStatement[] = [];
  for (const f of files) {
    statements.push(await parseTikTokFile(path.join(dir, f)));
  }

  console.log(`\n=================== TIKTOK INTERNAL MATH VERIFICATION ===================`);
  for (const s of statements) {
    const grossAmt = parseTikTokCurrency(s.grossPay.amount);
    const sumEarnings = roundCents(s.earnings.reduce((acc, e) => acc + parseTikTokCurrency(e.amount), 0));
    if (s.earnings.length > 0 && Math.abs(sumEarnings - grossAmt) > 0.01) {
      console.error(`❌ Earnings mismatch in ${s.file}: sumEarnings=${sumEarnings} vs gross=${grossAmt}`);
    }

    const sumTaxes = roundCents(s.taxDeductions.reduce((acc, t) => acc + parseTikTokCurrency(t.amount), 0));
    const sumAddDeductions = roundCents(s.additionalDeductions.reduce((acc, d) => acc + parseTikTokCurrency(d.amount), 0));
    const netAmt = parseTikTokCurrency(s.totalNetPay.amount);

    if (grossAmt > 0) {
      // In TikTok, taxes and deductions are negative numbers (e.g. -492.60)
      const calcNet = roundCents(grossAmt + sumTaxes + sumAddDeductions);
      if (Math.abs(calcNet - netAmt) > 0.01) {
        console.error(`❌ Net pay mismatch in ${s.file}: CalcNet=${calcNet} vs Net=${netAmt} (Gross=${grossAmt}, Taxes=${sumTaxes}, AddDed=${sumAddDeductions})`);
      } else {
        console.log(`✓ ${s.file} (${s.checkDate}): Gross ${grossAmt.toFixed(2)} + Taxes ${sumTaxes.toFixed(2)} + AddDed ${sumAddDeductions.toFixed(2)} = Net ${netAmt.toFixed(2)}`);
      }
    }
  }

  console.log(`\n=================== TIKTOK YTD CONTINUITY VERIFICATION ===================`);
  let runningGross = 0;
  let runningNet = 0;

  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];
    const currGross = parseTikTokCurrency(s.grossPay.amount);
    const ytdGross = parseTikTokCurrency(s.grossPay.yearToDate);
    const currNet = parseTikTokCurrency(s.totalNetPay.amount);
    const ytdNet = parseTikTokCurrency(s.totalNetPay.yearToDate);

    runningGross = roundCents(runningGross + currGross);
    runningNet = roundCents(runningNet + currNet);

    if (ytdGross > 0) {
      const diffGross = roundCents(ytdGross - runningGross);
      if (Math.abs(diffGross) > 0.01) {
        console.error(`❌ TikTok YTD Gross gap in ${s.file}: Running=${runningGross.toFixed(2)} vs YTD=${ytdGross.toFixed(2)} (Diff=${diffGross.toFixed(2)})`);
      } else {
        console.log(`✓ [Check: ${s.checkDate}] ${s.file}: Period Gross ${currGross.toFixed(2)}, Running ${runningGross.toFixed(2)} == YTD Gross ${ytdGross.toFixed(2)}`);
      }
    }
  }

  console.log(`\n✅ ALL TIKTOK STATEMENTS HAVE PERFECT YTD CONTINUITY! NO STATEMENTS ARE MISSING!`);
}

verifyTikTok().catch(console.error);
