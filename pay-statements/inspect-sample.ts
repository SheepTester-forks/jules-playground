import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

function maskMoney(text: string): string {
  // Replace patterns like $1,234.56 or 1,234.56 or -123.45 with [AMT]
  return text.replace(/\$?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g, '[AMT]');
}

async function inspect(filePath: string) {
  const data = fs.readFileSync(filePath);
  const parser = new PDFParse({ data });
  const res = await parser.getText();
  console.log('=== FILE:', path.basename(filePath), '===');
  console.log('Pages:', res.total);
  console.log(maskMoney(res.text));
  await parser.destroy();
}

async function main() {
  const ucDir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const tiktokDir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';

  const ucSample = path.join(ucDir, 'SSPOFADV.pdf');
  const tiktokSample = path.join(tiktokDir, 'Payslip_2025-07-03.pdf');

  console.log('--- UC SAMPLE ---');
  await inspect(ucSample);

  console.log('\n--- TIKTOK SAMPLE ---');
  await inspect(tiktokSample);
}

main().catch(console.error);
