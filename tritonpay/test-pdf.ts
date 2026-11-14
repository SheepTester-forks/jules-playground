import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function main() {
  const dir = '/mnt/c/Users/seant/Downloads/tritonpay statements';
  const file = 'UCSD Statement  01_19_2024-010424.pdf';
  const filePath = path.join(dir, file);
  const dataBuffer = fs.readFileSync(filePath);
  
  const parser = new PDFParse({ data: dataBuffer });
  const textResult = await parser.getText();
  console.log('Total pages:', textResult.total);
  console.log('--- TEXT ---');
  console.log(textResult.text);
  await parser.destroy();
}

main().catch(console.error);
