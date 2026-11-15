import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function examineTikTok(file: string) {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const parser = new PDFParse({ data: fs.readFileSync(path.join(dir, file)) });
  const doc = await parser.load();
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();

  console.log(`\n--- TikTok coords: ${file} ---`);
  const items = (tc.items as any[]).filter(it => it.str && it.str.trim());
  items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

  for (const it of items) {
    console.log(`y: ${it.transform[5].toFixed(1)}, x: ${it.transform[4].toFixed(1)}, text: "${it.str}"`);
  }
  await parser.destroy();
}

async function main() {
  await examineTikTok('Payslip_2025-07-03.pdf');
  await examineTikTok('Payslip_2025-08-15.pdf');
  await examineTikTok('Payslip_2025-08-29.pdf');
}

main().catch(console.error);
