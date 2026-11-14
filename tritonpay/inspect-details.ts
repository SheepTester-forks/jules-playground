import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

interface LineItem {
  datePosted: string;
  term: string;
  description: string;
  charge: number | null;
  credit: number | null;
  rawText: string;
}

interface ParsedStatement {
  file: string;
  statementDate: string;
  dueDate: string;
  studentId: string;
  studentName: string;
  previousBalance: number;
  currentBalance: number;
  totalDue: number;
  items: LineItem[];
  warnings: string[];
}

// Let's inspect coordinates on all files to see exact bounding boxes for columns
async function inspectFile(filePath: string): Promise<void> {
  const file = path.basename(filePath);
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const doc = await parser.load();

  console.log(`\n======================================================`);
  console.log(`FILE: ${file} (Pages: ${doc.numPages})`);

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const tc = await page.getTextContent();
    const items = tc.items.filter((it: any) => 'str' in it && it.str.trim());

    // Check if this page has statement items (starts after "Statement Details" or is continuation page)
    console.log(`--- Page ${pageNum} text items (${items.length} items) ---`);
    for (const it of items) {
      const x = (it as any).transform[4].toFixed(1);
      const y = (it as any).transform[5].toFixed(1);
      const str = (it as any).str;
      // print if it's within transaction area
      console.log(`  [y=${y}, x=${x}] "${str}"`);
    }
  }

  await parser.destroy();
}

async function main() {
  const dir = '/mnt/c/Users/seant/Downloads/tritonpay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  // Test on first 3 files
  for (const f of files.slice(0, 3)) {
    await inspectFile(path.join(dir, f));
  }
}

main().catch(console.error);
