import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

function maskMoney(text: string): string {
  return text.replace(/\$?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g, '[NUM]');
}

async function inspectFiles() {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const targetFiles = ['Payslip_2025-08-15.pdf', 'Payslip_2025-08-29.pdf', 'Payslip_2025-10-24.pdf'];

  for (const file of targetFiles) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    console.log(`\n=================== FILE: ${file} ===================`);
    console.log(maskMoney(textResult.text));
    await parser.destroy();
  }
}

inspectFiles().catch(console.error);
