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
    console.log(`${file}: ${doc.numPages} pages`);
    await parser.destroy();
  }
}

main().catch(console.error);
