import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

export interface TikTokStatement {
  file: string;
  empNo: string;
  costCenter: string;
  periodBeginning: string;
  periodEnding: string;
  checkDate: string;
  persNo: string;
  basisOfPay: string;
  earnings: {
    item: string;
    rate: string;
    hoursUnits: string;
    amount: string;
    yearToDate: string;
  }[];
  grossPay: {
    amount: string;
    yearToDate: string;
  };
  quotaSummary: {
    quota: string;
    earned: string;
    used: string;
    balance: string;
  }[];
  taxDeductions: {
    jurisdiction: string; // 'Federal' | 'California'
    item: string;
    amount: string;
    yearToDate: string;
  }[];
  additionalDeductions: {
    item: string;
    amount: string;
  }[];
  otherBenefits: {
    item: string;
    thisPeriod: string;
    yearToDate: string;
  }[];
  paymentMethod: {
    method: string;
    amount: string;
  }[];
  totalNetPay: {
    amount: string;
    yearToDate: string;
  };
  totalWorkHours: string;
  federalTaxableWages: string;
  depositStub: {
    accountOf: string;
    paymentType: string;
    accountNo: string;
    bankCheckNo: string;
    currency: string;
    amount: string;
  };
}

export function parseTikTokCurrency(str: string): number {
  if (!str) return 0;
  let clean = str.trim();
  let isNegative = false;
  if (clean.endsWith('-')) {
    isNegative = true;
    clean = clean.slice(0, -1);
  } else if (clean.startsWith('-')) {
    isNegative = true;
    clean = clean.slice(1);
  }
  clean = clean.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const val = parseFloat(clean);
  if (isNaN(val)) return 0;
  return isNegative ? -val : val;
}

export async function parseTikTokFile(filePath: string): Promise<TikTokStatement> {
  const data = fs.readFileSync(filePath);
  const parser = new PDFParse({ data });
  const doc = await parser.load();
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = (tc.items as any[]).filter(it => it.str && it.str.trim());

  // Group items by line y
  const lineMap = new Map<number, any[]>();
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    let matchY = Array.from(lineMap.keys()).find(k => Math.abs(k - y) <= 2);
    if (matchY === undefined) {
      lineMap.set(y, [it]);
    } else {
      lineMap.get(matchY)!.push(it);
    }
  }

  const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
  const lines = sortedYs.map(y => {
    const row = lineMap.get(y)!;
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    return { y, items: row };
  });

  const fullText = (await parser.getText()).text;

  // Headers
  const empMatch = fullText.match(/EMP\s*#[\s\r\n]+(\d+)/i);
  const empNo = empMatch ? empMatch[1] : '';
  const ccMatch = fullText.match(/Cost Center:\s*(\d+)/i);
  const costCenter = ccMatch ? ccMatch[1] : '';
  const pbMatch = fullText.match(/Period Beginning:\s*([0-9.]+)/i);
  const periodBeginning = pbMatch ? pbMatch[1] : '';
  const peMatch = fullText.match(/Period Ending:\s*([0-9.]+)/i);
  const periodEnding = peMatch ? peMatch[1] : '';
  const cdMatch = fullText.match(/Check Date:\s*([0-9.]+)/i);
  const checkDate = cdMatch ? cdMatch[1] : '';
  const persMatch = fullText.match(/Pers\.\s*No\s*(\d+)/i);
  const persNo = persMatch ? persMatch[1] : '';
  const bopMatch = fullText.match(/Basis of Pay:\s*(\w+)/i);
  const basisOfPay = bopMatch ? bopMatch[1] : '';

  const earnings: TikTokStatement['earnings'] = [];
  let grossPay = { amount: '', yearToDate: '' };
  const quotaSummary: TikTokStatement['quotaSummary'] = [];
  const taxDeductions: TikTokStatement['taxDeductions'] = [];
  const additionalDeductions: TikTokStatement['additionalDeductions'] = [];
  const otherBenefits: TikTokStatement['otherBenefits'] = [];
  const paymentMethod: TikTokStatement['paymentMethod'] = [];
  let totalNetPay = { amount: '', yearToDate: '' };
  let totalWorkHours = '';
  let federalTaxableWages = '';
  let depositStub = { accountOf: '', paymentType: '', accountNo: '', bankCheckNo: '', currency: '', amount: '' };

  let currentTaxJurisdiction = 'Federal';

  for (const line of lines) {
    const y = line.y;
    const strAll = line.items.map(it => it.str).join(' ');

    if (strAll.includes('Tax Deductions: Federal')) {
      currentTaxJurisdiction = 'Federal';
    } else if (strAll.includes('Tax Deductions: California')) {
      currentTaxJurisdiction = 'California';
    }

    // Check line for Total Work Hours
    if (strAll.includes('Total Work Hours for Pay')) {
      const val = line.items[line.items.length - 1];
      if (val && /^[0-9,.]+$/.test(val.str.trim())) {
        totalWorkHours = val.str.trim();
      }
    }

    // Check line for federal taxable wages
    if (strAll.includes('federal taxable wages')) {
      const val = line.items[line.items.length - 1];
      if (val && /^[0-9,.]+$/.test(val.str.trim())) {
        federalTaxableWages = val.str.trim();
      }
    }

    // Left side items vs Right side items
    // Left side is x < 340, Right side is x >= 340
    const left = line.items.filter(it => it.transform[4] < 340);
    const right = line.items.filter(it => it.transform[4] >= 340);

    // Left side parsing
    if (left.length > 0) {
      const leftStr = left.map(it => it.str.trim()).join(' ');
      if (leftStr.startsWith('Gross Pay')) {
        const cur = left.find(it => it.transform[4] >= 170 && it.transform[4] < 240 && /^[0-9,.]+-?$/.test(it.str.trim()));
        const ytd = left.find(it => it.transform[4] >= 240 && /^[0-9,.]+-?$/.test(it.str.trim()));
        grossPay = {
          amount: cur ? cur.str.trim() : '',
          yearToDate: ytd ? ytd.str.trim() : '',
        };
      } else if (leftStr.startsWith('Total Net Pay')) {
        const cur = left.find(it => it.transform[4] >= 170 && it.transform[4] < 240 && /^[0-9,.]+-?$/.test(it.str.trim()));
        const ytd = left.find(it => it.transform[4] >= 240 && /^[0-9,.]+-?$/.test(it.str.trim()));
        totalNetPay = {
          amount: cur ? cur.str.trim() : '',
          yearToDate: ytd ? ytd.str.trim() : '',
        };
      } else if (['Regular', 'Holiday', 'WFH Allow'].includes(left[0].str.trim())) {
        const item = left[0].str.trim();
        const rate = left.find(it => it.transform[4] >= 90 && it.transform[4] < 135 && /^[0-9,.]+$/.test(it.str.trim()));
        const hours = left.find(it => it.transform[4] >= 135 && it.transform[4] < 175 && /^[0-9,.]+$/.test(it.str.trim()));
        const cur = left.find(it => it.transform[4] >= 175 && it.transform[4] < 240 && /^[0-9,.]+$/.test(it.str.trim()));
        const ytd = left.find(it => it.transform[4] >= 240 && /^[0-9,.]+$/.test(it.str.trim()));
        earnings.push({
          item,
          rate: rate ? rate.str.trim() : '',
          hoursUnits: hours ? hours.str.trim() : '',
          amount: cur ? cur.str.trim() : '',
          yearToDate: ytd ? ytd.str.trim() : '',
        });
      } else if (['Withholding Tax', 'EE Social Security Tax', 'EE Medicare Tax', 'EE Voluntary Disabilit'].includes(left[0].str.trim())) {
        const item = left[0].str.trim();
        const cur = left.find(it => it.transform[4] >= 175 && it.transform[4] < 240 && /^[0-9,.]+-?$/.test(it.str.trim()));
        const ytd = left.find(it => it.transform[4] >= 240 && /^[0-9,.]+-?$/.test(it.str.trim()));
        taxDeductions.push({
          jurisdiction: currentTaxJurisdiction,
          item,
          amount: cur ? cur.str.trim() : '',
          yearToDate: ytd ? ytd.str.trim() : '',
        });
      } else if (leftStr.includes('Net offset (for wire)')) {
        const nums = left.filter(it => /^[0-9,.]+-?$/.test(it.str.trim()));
        if (nums.length > 0) {
          additionalDeductions.push({
            item: 'Net offset (for wire)',
            amount: nums[0].str.trim(),
          });
        }
      }
    }

    // Right side parsing
    if (right.length > 0) {
      const rightStr = right.map(it => it.str.trim()).join(' ');
      if (right[0].str.trim() === 'PSLBal' || right[0].str.trim() === 'PTOBal') {
        const quota = right[0].str.trim();
        const nums = right.slice(1).map(it => it.str.trim()).filter(s => /^[0-9,.]+$/.test(s));
        if (nums.length === 3) {
          quotaSummary.push({ quota, earned: nums[0], used: nums[1], balance: nums[2] });
        } else if (nums.length === 1) {
          quotaSummary.push({ quota, earned: '', used: '', balance: nums[0] });
        }
      } else if (['TransportationSu', 'ByteMall Points', 'GymMembership'].some(b => rightStr.includes(b))) {
        let bItem = '';
        if (rightStr.includes('TransportationSu')) bItem = 'TransportationSu';
        else if (rightStr.includes('ByteMall Points')) bItem = 'ByteMall Points';
        else if (rightStr.includes('GymMembership')) bItem = 'GymMembership';

        const nums = right.map(it => it.str.trim()).filter(s => /^[0-9,.]+$/.test(s));
        if (nums.length === 2) {
          otherBenefits.push({ item: bItem, thisPeriod: nums[0], yearToDate: nums[1] });
        } else if (nums.length === 1) {
          otherBenefits.push({ item: bItem, thisPeriod: '', yearToDate: nums[0] });
        }
      } else if (rightStr.includes('Direct Deposit')) {
        const nums = right.map(it => it.str.trim()).filter(s => /^[0-9,.]+$/.test(s));
        if (nums.length > 0) {
          paymentMethod.push({ method: 'Direct Deposit', amount: nums[0] });
        }
      }
    }

    // Deposit stub at bottom (y around 100 - 130)
    if (y < 130 && y > 80) {
      if (strAll.includes('Sean Yen')) {
        // Look for items
        const typeIt = line.items.find(it => it.str.includes('Bank') || it.str.includes('transfer'));
        const acctIt = line.items.find(it => it.str.includes('XXXXX'));
        const checkIt = line.items.find(it => /^\d{9}$/.test(it.str.trim()));
        const currIt = line.items.find(it => it.str.includes('USD'));
        const amtIt = line.items[line.items.length - 1];

        depositStub = {
          accountOf: 'Sean Yen',
          paymentType: typeIt ? 'Bank transfer' : '',
          accountNo: acctIt ? acctIt.str.trim() : '',
          bankCheckNo: checkIt ? checkIt.str.trim() : '',
          currency: currIt ? 'USD' : '',
          amount: amtIt ? amtIt.str.trim() : '',
        };
      }
    }
  }

  await parser.destroy();

  return {
    file: path.basename(filePath),
    empNo,
    costCenter,
    periodBeginning,
    periodEnding,
    checkDate,
    persNo,
    basisOfPay,
    earnings,
    grossPay,
    quotaSummary,
    taxDeductions,
    additionalDeductions,
    otherBenefits,
    paymentMethod,
    totalNetPay,
    totalWorkHours,
    federalTaxableWages,
    depositStub,
  };
}

async function testTikTok() {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  console.log(`Testing TikTok parser for ${files.length} files...`);

  for (const f of files) {
    const res = await parseTikTokFile(path.join(dir, f));
    console.log(`Parsed ${f}: CheckDate=${res.checkDate}, Gross=${res.grossPay.amount}, Net=${res.totalNetPay.amount}, EarningsCount=${res.earnings.length}, TaxCount=${res.taxDeductions.length}`);
  }
}

testTikTok().catch(console.error);
