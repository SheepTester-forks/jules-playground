import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

interface Analysis {
  tables: Record<string, {
    columns: Set<string>;
    sampleRows: any[];
    occurrences: number;
  }>;
}

async function deepInspectUc() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  console.log(`Analyzing ${files.length} UC files...`);

  const allHeaders = new Set<string>();
  const linePatterns: Record<string, number> = {};

  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;

    // Check occurrences of various sections
    const sections = [
      'HOURS AND EARNINGS',
      'TAXES',
      'BEFORE-TAX DEDUCTIONS',
      'AFTER-TAX DEDUCTIONS',
      'EMPLOYER PAID BENEFITS',
      'TOT GRS',
      'NET PAY DISTRIBUTION',
      'TAX DATA',
    ];

    for (const s of sections) {
      if (text.includes(s)) {
        linePatterns[s] = (linePatterns[s] || 0) + 1;
      }
    }

    await parser.destroy();
  }

  console.log('UC Section occurrence counts:', linePatterns);
}

async function deepInspectTikTok() {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  console.log(`Analyzing ${files.length} TikTok files...`);

  const linePatterns: Record<string, number> = {};

  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;

    const sections = [
      'Earnings',
      'Quota Summary',
      'Tax Deductions: Federal',
      'Tax Deductions: California',
      'Payment Method',
      'Total Net Pay',
      'Deposited to the account of',
      'Total Work Hours for Pay Period',
      'Your federal taxable wages',
    ];

    for (const s of sections) {
      if (text.includes(s)) {
        linePatterns[s] = (linePatterns[s] || 0) + 1;
      }
    }

    await parser.destroy();
  }

  console.log('TikTok Section occurrence counts:', linePatterns);
}

async function main() {
  await deepInspectUc();
  await deepInspectTikTok();
}

main().catch(console.error);
