import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function main() {
  const dir = '/mnt/c/Users/seant/Downloads/tritonpay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const doc = await parser.load();

    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = (tc.items as any[]).filter(it => it.str && it.str.trim());

      // Let's find rows with dates MM/DD/YYYY
      // In PDF, items have transform[4] (x) and transform[5] (y)
      // Group items with similar y (difference < 3)
      const rowsByY: { y: number; items: any[] }[] = [];
      for (const it of items) {
        const y = it.transform[5];
        let row = rowsByY.find(r => Math.abs(r.y - y) < 3);
        if (!row) {
          row = { y, items: [] };
          rowsByY.push(row);
        }
        row.items.push(it);
      }

      // Sort rows by y descending (top to bottom)
      rowsByY.sort((a, b) => b.y - a.y);

      for (const row of rowsByY) {
        // Sort items in row by x ascending (left to right)
        row.items.sort((a, b) => a.transform[4] - b.transform[4]);
        const fullLine = row.items.map(it => `[x=${it.transform[4].toFixed(1)}] ${it.str}`).join(' | ');
        const textOnly = row.items.map(it => it.str).join(' ');

        // Check if row has a date at x ~ 87
        const first = row.items[0];
        if (first && Math.abs(first.transform[4] - 87.3) < 10 && /^\d{2}\/\d{2}\/\d{4}$/.test(first.str)) {
          console.log(`Page ${p} [TX]: ${fullLine}`);
        } else if (/PREVIOUS ACCOUNT BALANCE|CURRENT ACCOUNT BALANCE/i.test(textOnly)) {
          console.log(`Page ${p} [BAL]: ${fullLine}`);
        }
      }
    }
    await parser.destroy();
  }
}

main().catch(console.error);
