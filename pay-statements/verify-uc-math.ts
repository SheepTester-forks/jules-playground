import path from 'node:path';
import fs from 'node:fs';
import { parseUcFile } from './test-uc-parser.ts';
import type { UcStatement } from './test-uc-parser.ts';

function toNum(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[$,]/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

async function verifyUc() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  const statements: UcStatement[] = [];
  for (const f of files) {
    statements.push(await parseUcFile(path.join(dir, f)));
  }

  console.log(`\n=================== UC INTERNAL MATH VERIFICATION ===================`);
  let allInternalOk = true;

  for (const s of statements) {
    // 1. Earnings sum
    const sumEarningsCurr = roundCents(s.earnings.reduce((a, b) => a + toNum(b.currentEarnings), 0));
    const totEarningsCurr = roundCents(toNum(s.earningsTotal.currentEarnings));
    if (Math.abs(sumEarningsCurr - totEarningsCurr) > 0.01) {
      console.error(`❌ Earnings mismatch in ${s.file} (Advice ${s.adviceNo}): sum=${sumEarningsCurr} vs tot=${totEarningsCurr}`);
      allInternalOk = false;
    }

    // 2. Taxes sum
    const sumTaxesCurr = roundCents(s.taxes.reduce((a, b) => a + toNum(b.current), 0));
    const totTaxesCurr = roundCents(toNum(s.taxesTotal.current));
    if (Math.abs(sumTaxesCurr - totTaxesCurr) > 0.01) {
      console.error(`❌ Taxes mismatch in ${s.file} (Advice ${s.adviceNo}): sum=${sumTaxesCurr} vs tot=${totTaxesCurr}`);
      allInternalOk = false;
    }

    // 3. Summary row match
    const currSummary = s.summary.find(r => r.row === 'Current');
    if (currSummary) {
      const totGrs = roundCents(toNum(currSummary.totGrs));
      const totTax = roundCents(toNum(currSummary.totTax));
      const totDed = roundCents(toNum(currSummary.totDed));
      const netPay = roundCents(toNum(currSummary.netPay));

      if (Math.abs(totGrs - totEarningsCurr) > 0.01) {
        console.error(`❌ Tot Grs mismatch in ${s.file}: totGrs=${totGrs} vs earnings=${totEarningsCurr}`);
        allInternalOk = false;
      }
      if (Math.abs(totTax - totTaxesCurr) > 0.01) {
        console.error(`❌ Tot Tax mismatch in ${s.file}: totTax=${totTax} vs taxes=${totTaxesCurr}`);
        allInternalOk = false;
      }

      const calcNet = roundCents(totGrs - totTax - totDed);
      if (Math.abs(calcNet - netPay) > 0.01) {
        console.error(`❌ Net Pay mismatch in ${s.file}: Calc ${calcNet} vs Summary Net ${netPay}`);
        allInternalOk = false;
      }

      // Net pay distribution
      const sumDist = roundCents(s.netPayDistribution.reduce((a, b) => a + toNum(b.depositAmount), 0));
      if (Math.abs(sumDist - netPay) > 0.01) {
        console.error(`❌ Net Pay Distribution mismatch in ${s.file}: sumDist=${sumDist} vs Net ${netPay}`);
        allInternalOk = false;
      }
    } else {
      console.error(`❌ Missing Current summary in ${s.file}`);
      allInternalOk = false;
    }
  }

  if (allInternalOk) {
    console.log(`✅ All 51 UC statements passed internal math checks! (Earnings sum, Taxes sum, Deductions sum, Net Pay = Gross - Tax - Ded, Distribution = Net Pay)`);
  }

  console.log(`\n=================== UC CONTINUITY & YTD ACCUMULATION ===================`);
  // Sort statements chronologically by Pay End Date
  statements.sort((a, b) => new Date(a.payEnd).getTime() - new Date(b.payEnd).getTime());

  // Group by Calendar Year of Advice Date (or Pay End Date)
  const byYear = new Map<string, UcStatement[]>();
  for (const s of statements) {
    const yr = s.adviceDate.split('/')[2];
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr)!.push(s);
  }

  let allContinuityOk = true;

  for (const [yr, yearStmts] of byYear.entries()) {
    console.log(`\n--- Calendar Year ${yr} (${yearStmts.length} statements) ---`);
    let runningGross = 0;
    let runningNet = 0;
    let runningTax = 0;

    for (let i = 0; i < yearStmts.length; i++) {
      const s = yearStmts[i];
      const currSum = s.summary.find(r => r.row === 'Current')!;
      const ytdSum = s.summary.find(r => r.row === 'YTD')!;

      const currGross = toNum(currSum.totGrs);
      const currNet = toNum(currSum.netPay);
      const currTax = toNum(currSum.totTax);

      const ytdGross = toNum(ytdSum.totGrs);
      const ytdNet = toNum(ytdSum.netPay);
      const ytdTax = toNum(ytdSum.totTax);

      runningGross = roundCents(runningGross + currGross);
      runningNet = roundCents(runningNet + currNet);
      runningTax = roundCents(runningTax + currTax);

      const diffGross = roundCents(ytdGross - runningGross);
      const diffNet = roundCents(ytdNet - runningNet);
      const diffTax = roundCents(ytdTax - runningTax);

      if (Math.abs(diffGross) > 0.01 || Math.abs(diffNet) > 0.01) {
        console.error(`❌ YTD MISMATCH in ${yr} stmt #${i + 1} (${s.file}, Advice ${s.adviceNo}, Period: ${s.payBegin} - ${s.payEnd}, Advice Date: ${s.adviceDate}):`);
        console.error(`   Running Gross: ${runningGross.toFixed(2)} vs YTD Gross: ${ytdGross.toFixed(2)} (Diff: ${diffGross.toFixed(2)})`);
        console.error(`   Running Net:   ${runningNet.toFixed(2)} vs YTD Net:   ${ytdNet.toFixed(2)} (Diff: ${diffNet.toFixed(2)})`);
        allContinuityOk = false;
      } else {
        console.log(`✓ [${s.adviceDate}] Advice ${s.adviceNo} (${s.payBegin} - ${s.payEnd}): Gross Curr ${currGross.toFixed(2)}, YTD ${ytdGross.toFixed(2)} MATCHES running sum`);
      }
    }
  }

  if (allContinuityOk) {
    console.log(`\n✅ ALL UC STATEMENTS HAVE PERFECT YTD CONTINUITY! NO STATEMENTS ARE MISSING!`);
  } else {
    console.log(`\n⚠️ POTENTIAL MISSING UC STATEMENTS DETECTED!`);
  }
}

verifyUc().catch(console.error);
