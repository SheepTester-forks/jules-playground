import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUcFile } from './test-uc-parser.ts';
import type { UcStatement } from './test-uc-parser.ts';
import { parseTikTokFile } from './test-tiktok-parser.ts';
import type { TikTokStatement } from './test-tiktok-parser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toTsv(rows: (string | number)[][]): string {
  return rows.map(r => r.map(c => String(c ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')).join('\t')).join('\n') + '\n';
}

async function exportAll() {
  const ucDir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const tiktokDir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';

  const ucFiles = fs.readdirSync(ucDir).filter(f => f.endsWith('.pdf')).sort();
  const tiktokFiles = fs.readdirSync(tiktokDir).filter(f => f.endsWith('.pdf')).sort();

  console.log(`Parsing ${ucFiles.length} UC files...`);
  const ucStatements: UcStatement[] = [];
  for (const f of ucFiles) {
    ucStatements.push(await parseUcFile(path.join(ucDir, f)));
  }
  // Sort UC statements chronologically
  ucStatements.sort((a, b) => new Date(a.payBegin).getTime() - new Date(b.payBegin).getTime());

  console.log(`Parsing ${tiktokFiles.length} TikTok files...`);
  const tiktokStatements: TikTokStatement[] = [];
  for (const f of tiktokFiles) {
    tiktokStatements.push(await parseTikTokFile(path.join(tiktokDir, f)));
  }
  // Sort TikTok statements chronologically by period beginning or file date
  tiktokStatements.sort((a, b) => a.file.localeCompare(b.file));

  // ==================== UC EXPORTS ====================
  // 1. uc_hours_and_earnings.tsv
  const ucEarningsRows: string[][] = [
    ['Source Statement', 'Description', 'Begin Date', 'End Date', 'Current Rate', 'Current Hours', 'Current Earnings', 'YTD Hours', 'YTD Earnings']
  ];
  for (const s of ucStatements) {
    for (const e of s.earnings) {
      ucEarningsRows.push([s.adviceNo, e.description, e.beginDate, e.endDate, e.currentRate, e.currentHours, e.currentEarnings, e.ytdHours, e.ytdEarnings]);
    }
    if (s.earningsTotal.currentEarnings || s.earningsTotal.ytdEarnings) {
      ucEarningsRows.push([s.adviceNo, 'TOTAL:', '', '', '', s.earningsTotal.currentHours, s.earningsTotal.currentEarnings, s.earningsTotal.ytdHours, s.earningsTotal.ytdEarnings]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc_hours_and_earnings.tsv'), toTsv(ucEarningsRows));

  // 2. uc_taxes.tsv
  const ucTaxesRows: string[][] = [
    ['Source Statement', 'Description', 'Current', 'YTD']
  ];
  for (const s of ucStatements) {
    for (const t of s.taxes) {
      ucTaxesRows.push([s.adviceNo, t.description, t.current, t.ytd]);
    }
    if (s.taxesTotal.current || s.taxesTotal.ytd) {
      ucTaxesRows.push([s.adviceNo, 'TOTAL:', s.taxesTotal.current, s.taxesTotal.ytd]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc_taxes.tsv'), toTsv(ucTaxesRows));

  // 3. uc_before_tax_deductions.tsv
  const ucBeforeTaxRows: string[][] = [
    ['Source Statement', 'Description', 'Current', 'YTD']
  ];
  for (const s of ucStatements) {
    for (const d of s.beforeTaxDeductions) {
      ucBeforeTaxRows.push([s.adviceNo, d.description, d.current, d.ytd]);
    }
    if (s.beforeTaxTotal.current || s.beforeTaxTotal.ytd) {
      ucBeforeTaxRows.push([s.adviceNo, 'TOTAL:', s.beforeTaxTotal.current, s.beforeTaxTotal.ytd]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc_before_tax_deductions.tsv'), toTsv(ucBeforeTaxRows));

  // 4. uc_after_tax_deductions.tsv
  const ucAfterTaxRows: string[][] = [
    ['Source Statement', 'Description', 'Current', 'YTD']
  ];
  for (const s of ucStatements) {
    for (const d of s.afterTaxDeductions) {
      ucAfterTaxRows.push([s.adviceNo, d.description, d.current, d.ytd]);
    }
    if (s.afterTaxTotal.current || s.afterTaxTotal.ytd) {
      ucAfterTaxRows.push([s.adviceNo, 'TOTAL:', s.afterTaxTotal.current, s.afterTaxTotal.ytd]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc_after_tax_deductions.tsv'), toTsv(ucAfterTaxRows));

  // 5. uc_employer_benefits.tsv
  const ucBenefitsRows: string[][] = [
    ['Source Statement', 'Description', 'Current', 'YTD']
  ];
  for (const s of ucStatements) {
    for (const b of s.employerBenefits) {
      ucBenefitsRows.push([s.adviceNo, b.description, b.current, b.ytd]);
    }
    if (s.employerBenefitsTotal.current || s.employerBenefitsTotal.ytd) {
      ucBenefitsRows.push([s.adviceNo, 'TOTAL:', s.employerBenefitsTotal.current, s.employerBenefitsTotal.ytd]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc_employer_benefits.tsv'), toTsv(ucBenefitsRows));

  // 6. uc_summary.tsv
  const ucSummaryRows: string[][] = [
    ['Source Statement', 'Row', 'TOT GRS', 'FED TAX GRS', 'OASDI GRS', 'MED GRS', 'ST TAX GRS', 'TOT TAX', 'TOT DED', 'NET PAY']
  ];
  for (const s of ucStatements) {
    for (const row of s.summary) {
      ucSummaryRows.push([s.adviceNo, row.row, row.totGrs, row.fedTaxGrs, row.oasdiGrs, row.medGrs, row.stTaxGrs, row.totTax, row.totDed, row.netPay]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc_summary.tsv'), toTsv(ucSummaryRows));

  // 7. uc_net_pay_distribution.tsv
  const ucDistRows: string[][] = [
    ['Source Statement', 'Account Type', 'Account Number', 'Deposit Amount']
  ];
  for (const s of ucStatements) {
    for (const d of s.netPayDistribution) {
      ucDistRows.push([s.adviceNo, d.accountType, d.accountNumber, d.depositAmount]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc_net_pay_distribution.tsv'), toTsv(ucDistRows));

  // 8. uc.tsv (Single combined TSV for UC containing all tabular data)
  const ucUnifiedRows: string[][] = [
    [
      'Source Statement',
      'Table',
      'Description',
      'Begin Date',
      'End Date',
      'Current Rate',
      'Current Hours',
      'Current Earnings',
      'YTD Hours',
      'YTD Earnings',
      'Current',
      'YTD',
      'TOT GRS',
      'FED TAX GRS',
      'OASDI GRS',
      'MED GRS',
      'ST TAX GRS',
      'TOT TAX',
      'TOT DED',
      'NET PAY',
      'Account Type',
      'Account Number',
      'Deposit Amount'
    ]
  ];
  for (const s of ucStatements) {
    // Earnings
    for (const e of s.earnings) {
      ucUnifiedRows.push([s.adviceNo, 'HOURS AND EARNINGS', e.description, e.beginDate, e.endDate, e.currentRate, e.currentHours, e.currentEarnings, e.ytdHours, e.ytdEarnings, '', '', '', '', '', '', '', '', '', '', '', '', '']);
    }
    if (s.earningsTotal.currentEarnings || s.earningsTotal.ytdEarnings) {
      ucUnifiedRows.push([s.adviceNo, 'HOURS AND EARNINGS', 'TOTAL:', '', '', '', s.earningsTotal.currentHours, s.earningsTotal.currentEarnings, s.earningsTotal.ytdHours, s.earningsTotal.ytdEarnings, '', '', '', '', '', '', '', '', '', '', '', '', '']);
    }
    // Taxes
    for (const t of s.taxes) {
      ucUnifiedRows.push([s.adviceNo, 'TAXES', t.description, '', '', '', '', '', '', '', t.current, t.ytd, '', '', '', '', '', '', '', '', '', '', '']);
    }
    if (s.taxesTotal.current || s.taxesTotal.ytd) {
      ucUnifiedRows.push([s.adviceNo, 'TAXES', 'TOTAL:', '', '', '', '', '', '', '', s.taxesTotal.current, s.taxesTotal.ytd, '', '', '', '', '', '', '', '', '', '', '']);
    }
    // Before-tax
    for (const d of s.beforeTaxDeductions) {
      ucUnifiedRows.push([s.adviceNo, 'BEFORE-TAX DEDUCTIONS', d.description, '', '', '', '', '', '', '', d.current, d.ytd, '', '', '', '', '', '', '', '', '', '', '']);
    }
    if (s.beforeTaxTotal.current || s.beforeTaxTotal.ytd) {
      ucUnifiedRows.push([s.adviceNo, 'BEFORE-TAX DEDUCTIONS', 'TOTAL:', '', '', '', '', '', '', '', s.beforeTaxTotal.current, s.beforeTaxTotal.ytd, '', '', '', '', '', '', '', '', '', '', '']);
    }
    // After-tax
    for (const d of s.afterTaxDeductions) {
      ucUnifiedRows.push([s.adviceNo, 'AFTER-TAX DEDUCTIONS', d.description, '', '', '', '', '', '', '', d.current, d.ytd, '', '', '', '', '', '', '', '', '', '', '']);
    }
    if (s.afterTaxTotal.current || s.afterTaxTotal.ytd) {
      ucUnifiedRows.push([s.adviceNo, 'AFTER-TAX DEDUCTIONS', 'TOTAL:', '', '', '', '', '', '', '', s.afterTaxTotal.current, s.afterTaxTotal.ytd, '', '', '', '', '', '', '', '', '', '', '']);
    }
    // Employer benefits
    for (const b of s.employerBenefits) {
      ucUnifiedRows.push([s.adviceNo, 'EMPLOYER PAID BENEFITS', b.description, '', '', '', '', '', '', '', b.current, b.ytd, '', '', '', '', '', '', '', '', '', '', '']);
    }
    // Summary
    for (const sm of s.summary) {
      ucUnifiedRows.push([s.adviceNo, '*TAXABLE', sm.row, '', '', '', '', '', '', '', '', '', sm.totGrs, sm.fedTaxGrs, sm.oasdiGrs, sm.medGrs, sm.stTaxGrs, sm.totTax, sm.totDed, sm.netPay, '', '', '']);
    }
    // Distribution
    for (const d of s.netPayDistribution) {
      ucUnifiedRows.push([s.adviceNo, 'NET PAY DISTRIBUTION', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', d.accountType, d.accountNumber, d.depositAmount]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'uc.tsv'), toTsv(ucUnifiedRows));

  // ==================== TIKTOK EXPORTS ====================
  // 1. tiktok_earnings.tsv
  const tiktokEarningsRows: string[][] = [
    ['Source Statement', 'Earnings', 'Rate', 'Hours/Units', 'Amount', 'Year-To-Date']
  ];
  for (const s of tiktokStatements) {
    for (const e of s.earnings) {
      tiktokEarningsRows.push([s.file, e.item, e.rate, e.hoursUnits, e.amount, e.yearToDate]);
    }
    if (s.grossPay.amount || s.grossPay.yearToDate) {
      tiktokEarningsRows.push([s.file, 'Gross Pay', '', '', s.grossPay.amount, s.grossPay.yearToDate]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok_earnings.tsv'), toTsv(tiktokEarningsRows));

  // 2. tiktok_tax_deductions.tsv
  const tiktokTaxRows: string[][] = [
    ['Source Statement', 'Tax Deductions', 'Amount', 'Year-To-Date']
  ];
  for (const s of tiktokStatements) {
    for (const t of s.taxDeductions) {
      tiktokTaxRows.push([s.file, `${t.jurisdiction ? t.jurisdiction + ': ' : ''}${t.item}`, t.amount, t.yearToDate]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok_tax_deductions.tsv'), toTsv(tiktokTaxRows));

  // 3. tiktok_additional_deductions.tsv
  const tiktokAddDedRows: string[][] = [
    ['Source Statement', 'Additional Deductions', 'Amount']
  ];
  for (const s of tiktokStatements) {
    for (const d of s.additionalDeductions) {
      tiktokAddDedRows.push([s.file, d.item, d.amount]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok_additional_deductions.tsv'), toTsv(tiktokAddDedRows));

  // 4. tiktok_other_benefits.tsv
  const tiktokBenefitsRows: string[][] = [
    ['Source Statement', 'Other Benefits and Information', 'This Period', 'Year-to-Date']
  ];
  for (const s of tiktokStatements) {
    for (const b of s.otherBenefits) {
      tiktokBenefitsRows.push([s.file, b.item, b.thisPeriod, b.yearToDate]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok_other_benefits.tsv'), toTsv(tiktokBenefitsRows));

  // 5. tiktok_quota_summary.tsv
  const tiktokQuotaRows: string[][] = [
    ['Source Statement', 'Quota Summary', 'Earned', 'Used', 'Balance']
  ];
  for (const s of tiktokStatements) {
    for (const q of s.quotaSummary) {
      tiktokQuotaRows.push([s.file, q.quota, q.earned, q.used, q.balance]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok_quota_summary.tsv'), toTsv(tiktokQuotaRows));

  // 6. tiktok_summary.tsv
  const tiktokSummaryRows: string[][] = [
    ['Source Statement', 'Summary Item', 'Amount', 'Year-To-Date']
  ];
  for (const s of tiktokStatements) {
    if (s.grossPay.amount || s.grossPay.yearToDate) {
      tiktokSummaryRows.push([s.file, 'Gross Pay', s.grossPay.amount, s.grossPay.yearToDate]);
    }
    if (s.totalNetPay.amount || s.totalNetPay.yearToDate) {
      tiktokSummaryRows.push([s.file, 'Total Net Pay', s.totalNetPay.amount, s.totalNetPay.yearToDate]);
    }
    if (s.totalWorkHours) {
      tiktokSummaryRows.push([s.file, 'Total Work Hours for Pay Period', s.totalWorkHours, '']);
    }
    if (s.federalTaxableWages) {
      tiktokSummaryRows.push([s.file, 'Your federal taxable wages', s.federalTaxableWages, '']);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok_summary.tsv'), toTsv(tiktokSummaryRows));

  // 7. tiktok_deposit_stub.tsv
  const tiktokStubRows: string[][] = [
    ['Source Statement', 'Deposited to the account of:', 'Payment Type', 'Account No.', 'Bank/Check No.', 'Amount']
  ];
  for (const s of tiktokStatements) {
    if (s.depositStub.accountOf) {
      tiktokStubRows.push([s.file, s.depositStub.accountOf, s.depositStub.paymentType, s.depositStub.accountNo, s.depositStub.bankCheckNo, s.depositStub.amount]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok_deposit_stub.tsv'), toTsv(tiktokStubRows));

  // 8. tiktok.tsv (Single combined TSV for TikTok containing all tabular data)
  const tiktokUnifiedRows: string[][] = [
    [
      'Source Statement',
      'Table',
      'Item',
      'Rate',
      'Hours/Units',
      'Amount',
      'Year-To-Date',
      'Earned',
      'Used',
      'Balance',
      'This Period',
      'Payment Type',
      'Account No.',
      'Bank/Check No.'
    ]
  ];
  for (const s of tiktokStatements) {
    // Earnings
    for (const e of s.earnings) {
      tiktokUnifiedRows.push([s.file, 'Earnings', e.item, e.rate, e.hoursUnits, e.amount, e.yearToDate, '', '', '', '', '', '', '']);
    }
    if (s.grossPay.amount || s.grossPay.yearToDate) {
      tiktokUnifiedRows.push([s.file, 'Earnings', 'Gross Pay', '', '', s.grossPay.amount, s.grossPay.yearToDate, '', '', '', '', '', '', '']);
    }
    // Quota Summary
    for (const q of s.quotaSummary) {
      tiktokUnifiedRows.push([s.file, 'Quota Summary', q.quota, '', '', '', '', q.earned, q.used, q.balance, '', '', '', '']);
    }
    // Tax Deductions
    for (const t of s.taxDeductions) {
      tiktokUnifiedRows.push([s.file, `Tax Deductions: ${t.jurisdiction}`, t.item, '', '', t.amount, t.yearToDate, '', '', '', '', '', '', '']);
    }
    // Additional Deductions
    for (const d of s.additionalDeductions) {
      tiktokUnifiedRows.push([s.file, 'Additional Deductions', d.item, '', '', d.amount, '', '', '', '', '', '', '', '']);
    }
    // Other Benefits
    for (const b of s.otherBenefits) {
      tiktokUnifiedRows.push([s.file, 'Other Benefits and Information', b.item, '', '', '', b.yearToDate, '', '', '', b.thisPeriod, '', '', '']);
    }
    // Summary
    if (s.totalNetPay.amount || s.totalNetPay.yearToDate) {
      tiktokUnifiedRows.push([s.file, 'Total Net Pay', 'Total Net Pay', '', '', s.totalNetPay.amount, s.totalNetPay.yearToDate, '', '', '', '', '', '', '']);
    }
    if (s.totalWorkHours) {
      tiktokUnifiedRows.push([s.file, 'Hours Summary', 'Total Work Hours for Pay Period', '', s.totalWorkHours, '', '', '', '', '', '', '', '', '']);
    }
    if (s.federalTaxableWages) {
      tiktokUnifiedRows.push([s.file, 'Taxable Wages Summary', 'Your federal taxable wages', '', '', s.federalTaxableWages, '', '', '', '', '', '', '', '']);
    }
    // Deposit stub
    if (s.depositStub.accountOf) {
      tiktokUnifiedRows.push([s.file, 'Deposited to the account of:', s.depositStub.accountOf, '', '', s.depositStub.amount, '', '', '', '', '', s.depositStub.paymentType, s.depositStub.accountNo, s.depositStub.bankCheckNo]);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'tiktok.tsv'), toTsv(tiktokUnifiedRows));

  console.log('\nAll TSV files successfully exported:');
  console.log('Main employer files:');
  console.log(' - uc.tsv');
  console.log(' - tiktok.tsv');
  console.log('Dedicated per-table files:');
  console.log(' - uc_hours_and_earnings.tsv');
  console.log(' - uc_taxes.tsv');
  console.log(' - uc_before_tax_deductions.tsv');
  console.log(' - uc_after_tax_deductions.tsv');
  console.log(' - uc_employer_benefits.tsv');
  console.log(' - uc_summary.tsv');
  console.log(' - uc_net_pay_distribution.tsv');
  console.log(' - tiktok_earnings.tsv');
  console.log(' - tiktok_tax_deductions.tsv');
  console.log(' - tiktok_additional_deductions.tsv');
  console.log(' - tiktok_other_benefits.tsv');
  console.log(' - tiktok_quota_summary.tsv');
  console.log(' - tiktok_summary.tsv');
  console.log(' - tiktok_deposit_stub.tsv');
}

exportAll().catch(console.error);
