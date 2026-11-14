import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function main() {
  const dir = '/mnt/c/Users/seant/Downloads/tritonpay statements';
  const file = 'UCSD Statement  01_19_2024-010424.pdf';
  const filePath = path.join(dir, file);
  const dataBuffer = fs.readFileSync(filePath);
  
  const parser = new PDFParse({ data: dataBuffer });
  const doc = await parser.load();
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  
  console.log('Items on page 1:');
  for (const item of textContent.items) {
    if ('str' in item && item.str.trim()) {
      // transform: [scaleX, skewY, skewX, scaleY, transX, transY]
      console.log(`x: ${item.transform[4].toFixed(1)}, y: ${item.transform[5].toFixed(1)}, str: "${item.str}"`);
    }
  }
  await parser.destroy();
}

main().catch(console.error);
