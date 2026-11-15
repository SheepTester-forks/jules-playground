import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

export interface UcStatement {
  file: string;
  adviceNo: string;
  adviceDate: string;
  payBegin: string;
  payEnd: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  payRate: string;
  earnings: {
    description: string;
    beginDate: string;
    endDate: string;
    currentRate: string;
    currentHours: string;
    currentEarnings: string;
    ytdHours: string;
    ytdEarnings: string;
  }[];
  earningsTotal: {
    currentHours: string;
    currentEarnings: string;
    ytdHours: string;
    ytdEarnings: string;
  };
  taxes: {
    description: string;
    current: string;
    ytd: string;
  }[];
  taxesTotal: {
    current: string;
    ytd: string;
  };
  beforeTaxDeductions: {
    description: string;
    current: string;
    ytd: string;
  }[];
  beforeTaxTotal: {
    current: string;
    ytd: string;
  };
  afterTaxDeductions: {
    description: string;
    current: string;
    ytd: string;
  }[];
  afterTaxTotal: {
    current: string;
    ytd: string;
  };
  employerBenefits: {
    description: string;
    current: string;
    ytd: string;
  }[];
  employerBenefitsTotal: {
    current: string;
    ytd: string;
  };
  summary: {
    row: string; // 'Current' or 'YTD'
    totGrs: string;
    fedTaxGrs: string;
    oasdiGrs: string;
    medGrs: string;
    stTaxGrs: string;
    totTax: string;
    totDed: string;
    netPay: string;
  }[];
  netPayDistribution: {
    accountType: string;
    accountNumber: string;
    depositAmount: string;
  }[];
}

export async function parseUcFile(filePath: string): Promise<UcStatement> {
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

  // Header extraction
  const adviceMatch = fullText.match(/Advice\s*#:\s*(\d+)/i);
  const adviceNo = adviceMatch ? adviceMatch[1].replace(/^0+/, '') : '';
  const adviceDateMatch = fullText.match(/Advice Date:\s*([0-9\/]+)/i);
  const adviceDate = adviceDateMatch ? adviceDateMatch[1] : '';
  const beginMatch = fullText.match(/Pay Begin Date:\s*([0-9\/]+)/i);
  const payBegin = beginMatch ? beginMatch[1] : '';
  const endMatch = fullText.match(/Pay End Date:\s*([0-9\/]+)/i);
  const payEnd = endMatch ? endMatch[1] : '';
  const empMatch = fullText.match(/Employee ID:\s*(\d+)/i);
  const employeeId = empMatch ? empMatch[1] : '';
  const deptMatch = fullText.match(/Department:\s*([^\n\r]+)/i);
  const department = deptMatch ? deptMatch[1].trim() : '';
  const jobMatch = fullText.match(/Job Title:\s*([^\n\r]+)/i);
  const jobTitle = jobMatch ? jobMatch[1].trim() : '';
  const rateMatch = fullText.match(/Pay Rate:\s*([^\n\r]+)/i);
  const payRate = rateMatch ? rateMatch[1].trim() : '';

  // Earnings and Taxes are between y=640 and y=560 (or before BEFORE-TAX DEDUCTIONS)
  // Let's locate the y position of BEFORE-TAX DEDUCTIONS
  const beforeTaxLine = lines.find(l => l.items.some(it => it.str.includes('BEFORE-TAX DEDUCTIONS')));
  const beforeTaxY = beforeTaxLine ? beforeTaxLine.y : 560;

  // Locate HOURS AND EARNINGS header y
  const hoursLine = lines.find(l => l.items.some(it => it.str.includes('HOURS AND EARNINGS')));
  const hoursY = hoursLine ? hoursLine.y : 637;

  // Locate *TAXABLE / TOT GRS line
  const totGrsLine = lines.find(l => l.items.some(it => it.str.includes('TOT GRS')));
  const totGrsY = totGrsLine ? totGrsLine.y : 500;

  // Locate NET PAY DISTRIBUTION line
  const netPayDistLine = lines.find(l => l.items.some(it => it.str.includes('NET PAY DISTRIBUTION')));
  const netPayDistY = netPayDistLine ? netPayDistLine.y : 460;

  // Locate MESSAGE line
  const messageLine = lines.find(l => l.items.some(it => it.str.includes('MESSAGE:')));
  const messageY = messageLine ? messageLine.y : 350;

  const earnings: UcStatement['earnings'] = [];
  let earningsTotal: UcStatement['earningsTotal'] = { currentHours: '', currentEarnings: '', ytdHours: '', ytdEarnings: '' };

  const taxes: UcStatement['taxes'] = [];
  let taxesTotal: UcStatement['taxesTotal'] = { current: '', ytd: '' };

  const beforeTaxDeductions: UcStatement['beforeTaxDeductions'] = [];
  let beforeTaxTotal: UcStatement['beforeTaxTotal'] = { current: '', ytd: '' };

  const afterTaxDeductions: UcStatement['afterTaxDeductions'] = [];
  let afterTaxTotal: UcStatement['afterTaxTotal'] = { current: '', ytd: '' };

  const employerBenefits: UcStatement['employerBenefits'] = [];
  let employerBenefitsTotal: UcStatement['employerBenefitsTotal'] = { current: '', ytd: '' };

  const summary: UcStatement['summary'] = [];
  const netPayDistribution: UcStatement['netPayDistribution'] = [];

  for (const line of lines) {
    const y = line.y;

    // 1. Hours & Earnings (left) + Taxes (right)
    if (y < hoursY - 15 && y > beforeTaxY) {
      // Check left side (x < 400)
      const left = line.items.filter(it => it.transform[4] < 400);
      if (left.length > 0) {
        const descIt = left.find(it => it.transform[4] < 120);
        if (descIt) {
          const desc = descIt.str.trim();
          if (desc === 'TOTAL:') {
            // Hours & earnings total
            const ch = left.find(it => it.transform[4] >= 240 && it.transform[4] < 285);
            const ce = left.find(it => it.transform[4] >= 285 && it.transform[4] < 330);
            const yh = left.find(it => it.transform[4] >= 330 && it.transform[4] < 365);
            const ye = left.find(it => it.transform[4] >= 365 && it.transform[4] < 400);
            earningsTotal = {
              currentHours: ch ? ch.str.trim() : '',
              currentEarnings: ce ? ce.str.trim() : '',
              ytdHours: yh ? yh.str.trim() : '',
              ytdEarnings: ye ? ye.str.trim() : '',
            };
          } else if (desc !== 'Description') {
            const bd = left.find(it => it.transform[4] >= 120 && it.transform[4] < 165);
            const ed = left.find(it => it.transform[4] >= 165 && it.transform[4] < 210);
            const cr = left.find(it => it.transform[4] >= 210 && it.transform[4] < 240);
            const ch = left.find(it => it.transform[4] >= 240 && it.transform[4] < 285);
            const ce = left.find(it => it.transform[4] >= 285 && it.transform[4] < 330);
            const yh = left.find(it => it.transform[4] >= 330 && it.transform[4] < 365);
            const ye = left.find(it => it.transform[4] >= 365 && it.transform[4] < 400);
            earnings.push({
              description: desc,
              beginDate: bd ? bd.str.trim() : '',
              endDate: ed ? ed.str.trim() : '',
              currentRate: cr ? cr.str.trim() : '',
              currentHours: ch ? ch.str.trim() : '',
              currentEarnings: ce ? ce.str.trim() : '',
              ytdHours: yh ? yh.str.trim() : '',
              ytdEarnings: ye ? ye.str.trim() : '',
            });
          }
        }
      }

      // Check right side (x >= 400): Taxes
      const right = line.items.filter(it => it.transform[4] >= 400);
      if (right.length > 0) {
        const descIt = right.find(it => it.transform[4] >= 400 && it.transform[4] < 490);
        if (descIt) {
          const desc = descIt.str.trim();
          const cur = right.find(it => it.transform[4] >= 490 && it.transform[4] < 560);
          const ytd = right.find(it => it.transform[4] >= 560);
          if (desc === 'TOTAL:') {
            taxesTotal = {
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            };
          } else if (desc !== 'Description' && desc !== 'TAXES') {
            taxes.push({
              description: desc,
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            });
          }
        }
      }
    }

    // 2. Deductions & Benefits (between beforeTaxY and totGrsY)
    if (y < beforeTaxY - 15 && y > totGrsY) {
      // Column 1: Before-Tax (x < 210)
      const c1 = line.items.filter(it => it.transform[4] < 210);
      if (c1.length > 0) {
        const descIt = c1.find(it => it.transform[4] < 120);
        if (descIt) {
          const desc = descIt.str.trim();
          const cur = c1.find(it => it.transform[4] >= 120 && it.transform[4] < 175);
          const ytd = c1.find(it => it.transform[4] >= 175);
          if (desc === 'TOTAL:') {
            beforeTaxTotal = {
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            };
          } else if (desc !== 'Description' && desc !== 'BEFORE-TAX DEDUCTIONS') {
            beforeTaxDeductions.push({
              description: desc,
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            });
          }
        }
      }

      // Column 2: After-Tax (210 <= x < 400)
      const c2 = line.items.filter(it => it.transform[4] >= 210 && it.transform[4] < 400);
      if (c2.length > 0) {
        const descIt = c2.find(it => it.transform[4] >= 210 && it.transform[4] < 310);
        if (descIt) {
          const desc = descIt.str.trim();
          const cur = c2.find(it => it.transform[4] >= 310 && it.transform[4] < 365);
          const ytd = c2.find(it => it.transform[4] >= 365);
          if (desc === 'TOTAL:') {
            afterTaxTotal = {
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            };
          } else if (desc !== 'Description' && desc !== 'AFTER-TAX DEDUCTIONS') {
            afterTaxDeductions.push({
              description: desc,
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            });
          }
        }
      }

      // Column 3: Benefits (x >= 400)
      const c3 = line.items.filter(it => it.transform[4] >= 400);
      if (c3.length > 0) {
        const descIt = c3.find(it => it.transform[4] >= 400 && it.transform[4] < 500);
        if (descIt) {
          const desc = descIt.str.trim();
          const cur = c3.find(it => it.transform[4] >= 500 && it.transform[4] < 560);
          const ytd = c3.find(it => it.transform[4] >= 560);
          if (desc === 'TOTAL:') {
            employerBenefitsTotal = {
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            };
          } else if (desc !== 'Description' && desc !== 'EMPLOYER PAID BENEFITS' && desc !== '*TAXABLE') {
            employerBenefits.push({
              description: desc,
              current: cur ? cur.str.trim() : '',
              ytd: ytd ? ytd.str.trim() : '',
            });
          }
        }
      }
    }

    // 3. Summary row (Current / YTD between totGrsY and netPayDistY)
    if (y < totGrsY && y > netPayDistY) {
      const rowIt = line.items.find(it => it.transform[4] < 50);
      if (rowIt && (rowIt.str.trim() === 'Current' || rowIt.str.trim() === 'YTD')) {
        const rowName = rowIt.str.trim();
        const tg = line.items.find(it => it.transform[4] >= 90 && it.transform[4] < 150);
        const ft = line.items.find(it => it.transform[4] >= 150 && it.transform[4] < 220);
        const oa = line.items.find(it => it.transform[4] >= 220 && it.transform[4] < 280);
        const md = line.items.find(it => it.transform[4] >= 280 && it.transform[4] < 340);
        const st = line.items.find(it => it.transform[4] >= 340 && it.transform[4] < 410);
        const tt = line.items.find(it => it.transform[4] >= 410 && it.transform[4] < 480);
        const td = line.items.find(it => it.transform[4] >= 480 && it.transform[4] < 540);
        const np = line.items.find(it => it.transform[4] >= 540);
        summary.push({
          row: rowName,
          totGrs: tg ? tg.str.trim() : '',
          fedTaxGrs: ft ? ft.str.trim() : '',
          oasdiGrs: oa ? oa.str.trim() : '',
          medGrs: md ? md.str.trim() : '',
          stTaxGrs: st ? st.str.trim() : '',
          totTax: tt ? tt.str.trim() : '',
          totDed: td ? td.str.trim() : '',
          netPay: np ? np.str.trim() : '',
        });
      }
    }

    // 4. Net pay distribution (below netPayDistY)
    if (y < netPayDistY - 5 && y > messageY) {
      const typeIt = line.items.find(it => it.transform[4] >= 140 && it.transform[4] < 210);
      const acctIt = line.items.find(it => it.transform[4] >= 210 && it.transform[4] < 300);
      const amtIt = line.items.find(it => it.transform[4] >= 300 && it.transform[4] < 450);
      if (typeIt && acctIt && amtIt && typeIt.str.trim() !== 'Account Type') {
        netPayDistribution.push({
          accountType: typeIt.str.trim(),
          accountNumber: acctIt.str.trim(),
          depositAmount: amtIt.str.trim(),
        });
      }
    }
  }

  await parser.destroy();

  return {
    file: path.basename(filePath),
    adviceNo,
    adviceDate,
    payBegin,
    payEnd,
    employeeId,
    department,
    jobTitle,
    payRate,
    earnings,
    earningsTotal,
    taxes,
    taxesTotal,
    beforeTaxDeductions,
    beforeTaxTotal,
    afterTaxDeductions,
    afterTaxTotal,
    employerBenefits,
    employerBenefitsTotal,
    summary,
    netPayDistribution,
  };
}

async function testAll() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  console.log(`Testing UC parsing for ${files.length} files...`);

  let countOk = 0;
  for (const f of files) {
    const res = await parseUcFile(path.join(dir, f));
    if (!res.adviceNo || !res.payBegin || !res.payEnd || res.summary.length !== 2) {
      console.error(`Issue in ${f}: Advice=${res.adviceNo}, summary rows=${res.summary.length}`);
    } else {
      countOk++;
    }
  }

  console.log(`Parsed ${countOk}/${files.length} UC files successfully.`);
}

testAll().catch(console.error);
