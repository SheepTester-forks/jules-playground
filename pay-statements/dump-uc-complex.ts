import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

function maskMoney(text: string): string {
  return text.replace(/\$?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g, '[NUM]');
}

async function dumpFileLines(file: string) {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const data = fs.readFileSync(path.join(dir, file));
  const parser = new PDFParse({ data });
  const doc = await parser.load();
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = (tc.items as any[]).filter(it => it.str && it.str.trim());

  const linesMap = new Map<number, any[]>();
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    let foundKey = Array.from(linesMap.keys()).find(k => Math.abs(k - y) <= 2);
    if (foundKey === undefined) {
      linesMap.set(y, [it]);
    } else {
      linesMap.get(foundKey)!.push(it);
    }
  }

  const sortedYs = Array.from(linesMap.keys()).sort((a, b) => b - a);
  console.log(`\n=================== FILE: ${file} ===================`);
  for (const y of sortedYs) {
    const row = linesMap.get(y)!;
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    const lineStr = row.map(it => `[x:${it.transform[4].toFixed(0)}] ${it.str}`).join('  |  ');
    console.log(`y:${y} | ` + maskMoney(lineStr));
  }
  await parser.destroy();
}

async function main() {
  await dumpFileLines('SSPOFADV (31).pdf');
  await dumpFileLines('SSPOFADV (42).pdf');
}

main().catch(console.error);
