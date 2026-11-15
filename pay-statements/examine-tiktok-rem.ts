import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function examineRemainingTikTok() {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const remaining = [
    'Payslip_2025-10-24.pdf',
    'Payslip_2025-12-21.pdf',
    'Payslip_2025-12-31.pdf',
    'Payslip_2026-01-02.pdf',
    'Payslip_2026-01-16.pdf',
  ];

  for (const f of remaining) {
    const parser = new PDFParse({ data: fs.readFileSync(path.join(dir, f)) });
    const doc = await parser.load();
    const page = await doc.getPage(1);
    const tc = await page.getTextContent();
    console.log(`\n=== FILE: ${f} ===`);
    const items = (tc.items as any[]).filter(it => it.str && it.str.trim());
    items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
    for (const it of items) {
      console.log(`y: ${it.transform[5].toFixed(1)}, x: ${it.transform[4].toFixed(1)}, text: "${it.str}"`);
    }
    await parser.destroy();
  }
}

examineRemainingTikTok().catch(console.error);
