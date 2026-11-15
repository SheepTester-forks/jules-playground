import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

function maskMoney(text: string): string {
  // Mask anything that looks like a dollar amount or currency
  return text.replace(/\$?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g, '[NUM]');
}

async function dumpLines(filePath: string) {
  const data = fs.readFileSync(filePath);
  const parser = new PDFParse({ data });
  const doc = await parser.load();
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();

  // Group items by vertical position y (rounded)
  const items = (tc.items as any[]).filter(it => it.str && it.str.trim());
  
  // Sort items top-to-bottom (y descending), left-to-right (x ascending)
  const linesMap = new Map<number, any[]>();
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    // find key within 3
    let foundKey = Array.from(linesMap.keys()).find(k => Math.abs(k - y) <= 2);
    if (foundKey === undefined) {
      linesMap.set(y, [it]);
    } else {
      linesMap.get(foundKey)!.push(it);
    }
  }

  const sortedYs = Array.from(linesMap.keys()).sort((a, b) => b - a);

  console.log(`=== DUMP LINES: ${path.basename(filePath)} ===`);
  for (const y of sortedYs) {
    const row = linesMap.get(y)!;
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    const lineStr = row.map(it => `[x:${it.transform[4].toFixed(0)}] ${it.str}`).join('  |  ');
    console.log(maskMoney(lineStr));
  }

  await parser.destroy();
}

async function main() {
  const ucDir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const tiktokDir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';

  await dumpLines(path.join(ucDir, 'SSPOFADV.pdf'));
  console.log('\n----------------------------------------\n');
  await dumpLines(path.join(tiktokDir, 'Payslip_2025-07-03.pdf'));
}

main().catch(console.error);
