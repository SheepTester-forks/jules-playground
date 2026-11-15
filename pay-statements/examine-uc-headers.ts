import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function examineUcHeaders() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const file = path.join(dir, 'SSPOFADV.pdf');
  const parser = new PDFParse({ data: fs.readFileSync(file) });
  const doc = await parser.load();
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();

  console.log('--- UC Text items near headers ---');
  for (const it of tc.items as any[]) {
    if (it.str && (it.transform[5] > 200 && it.transform[5] < 550)) {
      console.log(`x: ${it.transform[4].toFixed(1)}, y: ${it.transform[5].toFixed(1)}, text: "${it.str}"`);
    }
  }
  await parser.destroy();
}

examineUcHeaders().catch(console.error);
