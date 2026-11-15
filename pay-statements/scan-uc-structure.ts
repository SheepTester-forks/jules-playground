import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function scanUcStructure() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  const earningsDescriptions = new Set<string>();
  const taxesDescriptions = new Set<string>();
  const beforeTaxDescriptions = new Set<string>();
  const afterTaxDescriptions = new Set<string>();
  const benefitsDescriptions = new Set<string>();
  const distributionDescriptions = new Set<string>();

  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const doc = await parser.load();
    const page = await doc.getPage(1);
    const tc = await page.getTextContent();
    const items = (tc.items as any[]).filter(it => it.str && it.str.trim());

    // Group into horizontal lines
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

    // Check items in left column (x < 400) and right column (x >= 400)
    // Between y=630 and y=560 (HOURS AND EARNINGS on left, TAXES on right)
    for (const line of lines) {
      if (line.y < 620 && line.y > 565) {
        // Left side: Hours & earnings
        const leftItems = line.items.filter(it => it.transform[4] < 390);
        if (leftItems.length > 0 && !leftItems[0].str.includes('TOTAL:')) {
          earningsDescriptions.add(leftItems[0].str);
        }
        // Right side: Taxes
        const rightItems = line.items.filter(it => it.transform[4] >= 390);
        if (rightItems.length > 0 && !rightItems[0].str.includes('TOTAL:') && !rightItems[0].str.includes('TAXES') && !rightItems[0].str.includes('Description')) {
          taxesDescriptions.add(rightItems[0].str);
        }
      }
      if (line.y < 555 && line.y > 505) {
        // Before-tax (x < 210), After-tax (210 <= x < 400), Benefits (x >= 400)
        const c1 = line.items.filter(it => it.transform[4] < 210);
        if (c1.length > 0 && !c1[0].str.includes('TOTAL:') && !c1[0].str.includes('BEFORE-TAX') && !c1[0].str.includes('Description')) {
          beforeTaxDescriptions.add(c1[0].str);
        }
        const c2 = line.items.filter(it => it.transform[4] >= 210 && it.transform[4] < 400);
        if (c2.length > 0 && !c2[0].str.includes('TOTAL:') && !c2[0].str.includes('AFTER-TAX') && !c2[0].str.includes('Description')) {
          afterTaxDescriptions.add(c2[0].str);
        }
        const c3 = line.items.filter(it => it.transform[4] >= 400);
        if (c3.length > 0 && !c3[0].str.includes('TOTAL:') && !c3[0].str.includes('EMPLOYER') && !c3[0].str.includes('Description') && !c3[0].str.includes('*TAXABLE')) {
          benefitsDescriptions.add(c3[0].str);
        }
      }
    }

    await parser.destroy();
  }

  console.log('UC Unique Descriptions found:');
  console.log('Earnings:', Array.from(earningsDescriptions));
  console.log('Taxes:', Array.from(taxesDescriptions));
  console.log('Before-tax:', Array.from(beforeTaxDescriptions));
  console.log('After-tax:', Array.from(afterTaxDescriptions));
  console.log('Employer benefits:', Array.from(benefitsDescriptions));
}

scanUcStructure().catch(console.error);
