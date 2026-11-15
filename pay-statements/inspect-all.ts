import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function analyzeUcStatements() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} UC statement files.`);

  const summary = {
    totalFiles: files.length,
    pageCounts: {} as Record<number, number>,
    adviceNumbers: [] as string[],
    sectionsFound: new Set<string>(),
  };

  const sampleTexts: string[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const pages = textResult.total;
    summary.pageCounts[pages] = (summary.pageCounts[pages] || 0) + 1;

    // extract advice number
    const m = textResult.text.match(/Advice\s*#:\s*(\d+)/i);
    if (m) {
      summary.adviceNumbers.push(m[1]);
    } else {
      console.warn(`Warning: No advice number in ${file}`);
    }

    // Check headings
    const knownSections = [
      'HOURS AND EARNINGS',
      'TAXES',
      'BEFORE-TAX DEDUCTIONS',
      'AFTER-TAX DEDUCTIONS',
      'EMPLOYER PAID BENEFITS',
      'TOT GRS',
      'NET PAY DISTRIBUTION',
      'TAX DATA',
    ];
    for (const s of knownSections) {
      if (textResult.text.includes(s)) {
        summary.sectionsFound.add(s);
      }
    }

    await parser.destroy();
  }

  console.log('UC Summary:', {
    totalFiles: summary.totalFiles,
    pageCounts: summary.pageCounts,
    adviceCount: summary.adviceNumbers.length,
    uniqueAdvices: new Set(summary.adviceNumbers).size,
    sections: Array.from(summary.sectionsFound),
  });
}

async function analyzeTikTokStatements() {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
  console.log(`\nFound ${files.length} TikTok statement files.`);

  const summary = {
    totalFiles: files.length,
    pageCounts: {} as Record<number, number>,
    sectionsFound: new Set<string>(),
  };

  for (const file of files) {
    const filePath = path.join(dir, file);
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const pages = textResult.total;
    summary.pageCounts[pages] = (summary.pageCounts[pages] || 0) + 1;

    const knownSections = [
      'Earnings',
      'Tax Deductions',
      'Quota Summary',
      'Payment Method',
      'Total Net Pay',
      'Deposited to the account of',
    ];
    for (const s of knownSections) {
      if (textResult.text.includes(s)) {
        summary.sectionsFound.add(s);
      }
    }

    await parser.destroy();
  }

  console.log('TikTok Summary:', {
    totalFiles: summary.totalFiles,
    pageCounts: summary.pageCounts,
    sections: Array.from(summary.sectionsFound),
  });
}

async function main() {
  await analyzeUcStatements();
  await analyzeTikTokStatements();
}

main().catch(console.error);
