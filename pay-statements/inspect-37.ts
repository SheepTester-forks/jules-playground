import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function inspect37() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const file = 'SSPOFADV (37).pdf';
  const data = fs.readFileSync(path.join(dir, file));
  const parser = new PDFParse({ data });
  const doc = await parser.load();
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = (tc.items as any[]).filter(it => it.str && it.str.trim());
  items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
  for (const it of items) {
    if (it.transform[5] < 500) {
      console.log(`y:${it.transform[5].toFixed(1)}, x:${it.transform[4].toFixed(1)}, text: "${it.str}"`);
    }
  }
  await parser.destroy();
}

inspect37().catch(console.error);
