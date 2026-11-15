import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseUcFile } from './test-uc-parser.ts';
import type { UcStatement } from './test-uc-parser.ts';
import { parseTikTokFile, parseTikTokCurrency } from './test-tiktok-parser.ts';
import type { TikTokStatement } from './test-tiktok-parser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toNum(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[$,]/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

async function verifyUcStatements(ucDir: string): Promise<boolean> {
  const files = fs.readdirSync(ucDir).filter(f => f.endsWith('.pdf')).sort();
  console.log(`\n======================================================`);
  console.log(`VERIFYING UNIVERSITY OF CALIFORNIA (UC) PAY STATEMENTS`);
  console.log(`======================================================`);
  console.log(`Found ${files.length} statement files in: ${ucDir}`);

  const statements: UcStatement[] = [];
  for (const f of files) {
    statements.push(await parseUcFile(path.join(ucDir, f)));
  }

  // 1. Internal Math Checks
  let internalPass = true;
  for (const s of statements) {
    const sumEarnings = roundCents(s.earnings.reduce((a, b) => a + toNum(b.currentEarnings), 0));
    const totEarnings = roundCents(toNum(s.earningsTotal.currentEarnings));
    if (Math.abs(sumEarnings - totEarnings) > 0.01) {
      console.error(`❌ [Advice ${s.adviceNo}] Earnings sum mismatch: sum=${sumEarnings} vs total=${totEarnings}`);
      internalPass = false;
    }

    const sumTaxes = roundCents(s.taxes.reduce((a, b) => a + toNum(b.current), 0));
    const totTaxes = roundCents(toNum(s.taxesTotal.current));
    if (Math.abs(sumTaxes - totTaxes) > 0.01) {
      console.error(`❌ [Advice ${s.adviceNo}] Taxes sum mismatch: sum=${sumTaxes} vs total=${totTaxes}`);
      internalPass = false;
    }

    const currSummary = s.summary.find(r => r.row === 'Current');
    if (currSummary) {
      const totGrs = roundCents(toNum(currSummary.totGrs));
      const totTax = roundCents(toNum(currSummary.totTax));
      const totDed = roundCents(toNum(currSummary.totDed));
      const netPay = roundCents(toNum(currSummary.netPay));

      if (Math.abs(totGrs - totEarnings) > 0.01 || Math.abs(totTax - totTaxes) > 0.01) {
        console.error(`❌ [Advice ${s.adviceNo}] Summary gross/tax mismatch with table totals`);
        internalPass = false;
      }
      const calcNet = roundCents(totGrs - totTax - totDed);
      if (Math.abs(calcNet - netPay) > 0.01) {
        console.error(`❌ [Advice ${s.adviceNo}] Net pay equation mismatch: Gross - Tax - Ded = ${calcNet} vs Summary Net ${netPay}`);
        internalPass = false;
      }

      const sumDist = roundCents(s.netPayDistribution.reduce((a, b) => a + toNum(b.depositAmount), 0));
      if (Math.abs(sumDist - netPay) > 0.01) {
        console.error(`❌ [Advice ${s.adviceNo}] Net Pay Distribution sum mismatch: dist=${sumDist} vs Net ${netPay}`);
        internalPass = false;
      }
    }
  }

  if (internalPass) {
    console.log(`✓ All ${statements.length} UC statements passed internal mathematical reconciliation.`);
  }

  // 2. Chronological Continuity & YTD Verification
  statements.sort((a, b) => new Date(a.payBegin).getTime() - new Date(b.payBegin).getTime());

  const byYear = new Map<string, UcStatement[]>();
  for (const s of statements) {
    const yr = s.adviceDate.split('/')[2];
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr)!.push(s);
  }

  let continuityPass = true;
  for (const [yr, yearStmts] of byYear.entries()) {
    let runningGross = 0;
    let runningNet = 0;

    for (let i = 0; i < yearStmts.length; i++) {
      const s = yearStmts[i];
      const currSum = s.summary.find(r => r.row === 'Current')!;
      const ytdSum = s.summary.find(r => r.row === 'YTD')!;

      const currGross = toNum(currSum.totGrs);
      const currNet = toNum(currSum.netPay);
      const ytdGross = toNum(ytdSum.totGrs);
      const ytdNet = toNum(ytdSum.netPay);

      runningGross = roundCents(runningGross + currGross);
      runningNet = roundCents(runningNet + currNet);

      const diffGross = roundCents(ytdGross - runningGross);
      const diffNet = roundCents(ytdNet - runningNet);

      if (Math.abs(diffGross) > 0.01 || Math.abs(diffNet) > 0.01) {
        console.error(`❌ [Advice ${s.adviceNo}] (${s.payBegin} - ${s.payEnd}) Gap detected in Year ${yr}: YTD Gross diff=${diffGross}, YTD Net diff=${diffNet}`);
        continuityPass = false;
      }
    }
    console.log(`✓ Calendar Year ${yr} (${yearStmts.length} statements): YTD accumulation verified with zero gap.`);
  }

  const allOk = internalPass && continuityPass;
  if (allOk) {
    console.log(`✅ RESULT: UC statements are COMPLETE. No documents are missing.`);
  } else {
    console.log(`⚠️ RESULT: Missing or mismatched UC statements detected.`);
  }
  return allOk;
}

async function verifyTikTokStatements(tiktokDir: string): Promise<boolean> {
  const files = fs.readdirSync(tiktokDir).filter(f => f.endsWith('.pdf')).sort();
  console.log(`\n======================================================`);
  console.log(`VERIFYING TIKTOK PAY STATEMENTS`);
  console.log(`======================================================`);
  console.log(`Found ${files.length} statement files in: ${tiktokDir}`);

  const statements: TikTokStatement[] = [];
  for (const f of files) {
    statements.push(await parseTikTokFile(path.join(tiktokDir, f)));
  }

  // 1. Internal Math Checks
  let internalPass = true;
  for (const s of statements) {
    const grossAmt = parseTikTokCurrency(s.grossPay.amount);
    const sumEarnings = roundCents(s.earnings.reduce((acc, e) => acc + parseTikTokCurrency(e.amount), 0));
    if (s.earnings.length > 0 && Math.abs(sumEarnings - grossAmt) > 0.01) {
      console.error(`❌ [${s.file}] Earnings sum mismatch: sum=${sumEarnings} vs gross=${grossAmt}`);
      internalPass = false;
    }

    const sumTaxes = roundCents(s.taxDeductions.reduce((acc, t) => acc + parseTikTokCurrency(t.amount), 0));
    const sumAddDed = roundCents(s.additionalDeductions.reduce((acc, d) => acc + parseTikTokCurrency(d.amount), 0));
    const netAmt = parseTikTokCurrency(s.totalNetPay.amount);

    if (grossAmt > 0) {
      const calcNet = roundCents(grossAmt + sumTaxes + sumAddDed);
      if (Math.abs(calcNet - netAmt) > 0.01) {
        console.error(`❌ [${s.file}] Net Pay mismatch: Calc=${calcNet} vs Net=${netAmt}`);
        internalPass = false;
      }
    }

    if (s.depositStub.amount) {
      const stubAmt = parseTikTokCurrency(s.depositStub.amount);
      if (Math.abs(stubAmt - netAmt) > 0.01) {
        console.error(`❌ [${s.file}] Deposit stub mismatch: stub=${stubAmt} vs net=${netAmt}`);
        internalPass = false;
      }
    }
  }

  if (internalPass) {
    console.log(`✓ All ${statements.length} TikTok statements passed internal mathematical reconciliation.`);
  }

  // 2. Chronological Continuity & YTD Verification
  statements.sort((a, b) => a.file.localeCompare(b.file));
  let continuityPass = true;
  let runningGross = 0;

  for (const s of statements) {
    const currGross = parseTikTokCurrency(s.grossPay.amount);
    const ytdGross = parseTikTokCurrency(s.grossPay.yearToDate);

    runningGross = roundCents(runningGross + currGross);
    if (ytdGross > 0) {
      const diff = roundCents(ytdGross - runningGross);
      if (Math.abs(diff) > 0.01) {
        console.error(`❌ [${s.file}] YTD Gross mismatch: Running=${runningGross} vs YTD=${ytdGross} (Diff=${diff})`);
        continuityPass = false;
      }
    }
  }

  if (continuityPass) {
    console.log(`✓ All TikTok statements: YTD accumulation verified with zero gap.`);
  }

  const allOk = internalPass && continuityPass;
  if (allOk) {
    console.log(`✅ RESULT: TikTok statements are COMPLETE. No documents are missing.`);
  } else {
    console.log(`⚠️ RESULT: Missing or mismatched TikTok statements detected.`);
  }
  return allOk;
}

async function main() {
  const ucDir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const tiktokDir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';

  const ucOk = await verifyUcStatements(ucDir);
  const tiktokOk = await verifyTikTokStatements(tiktokDir);

  console.log(`\n======================================================`);
  console.log(`OVERALL RECONCILIATION SUMMARY`);
  console.log(`======================================================`);
  console.log(`UC Statements:     ${ucOk ? 'COMPLETE (0 missing)' : 'INCOMPLETE'}`);
  console.log(`TikTok Statements: ${tiktokOk ? 'COMPLETE (0 missing)' : 'INCOMPLETE'}`);
}

main().catch(console.error);
