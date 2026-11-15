import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

interface UcData {
  file: string;
  adviceNo: string;
  adviceDate: string;
  payBegin: string;
  payEnd: string;
  title: string;
  department: string;
  rate: string;
  earningsRows: any[];
  taxesRows: any[];
  beforeTaxRows: any[];
  afterTaxRows: any[];
  benefitsRows: any[];
  summary: any;
  netPayRows: any[];
}

function parseMoney(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[$,]/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

async function inspectAllUc() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  console.log(`Reading ${files.length} UC files...`);

  const results: UcData[] = [];

  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;

    // Header info
    const adviceMatch = text.match(/Advice\s*#:\s*(\d+)/i);
    const adviceDateMatch = text.match(/Advice Date:\s*([0-9\/]+)/i);
    const beginMatch = text.match(/Pay Begin Date:\s*([0-9\/]+)/i);
    const endMatch = text.match(/Pay End Date:\s*([0-9\/]+)/i);

    results.push({
      file,
      adviceNo: adviceMatch ? adviceMatch[1].replace(/^0+/, '') : '',
      adviceDate: adviceDateMatch ? adviceDateMatch[1] : '',
      payBegin: beginMatch ? beginMatch[1] : '',
      payEnd: endMatch ? endMatch[1] : '',
      title: '',
      department: '',
      rate: '',
      earningsRows: [],
      taxesRows: [],
      beforeTaxRows: [],
      afterTaxRows: [],
      benefitsRows: [],
      summary: {},
      netPayRows: [],
    });

    await parser.destroy();
  }

  // Sort by Advice Date or pay begin date
  results.sort((a, b) => new Date(a.payBegin).getTime() - new Date(b.payBegin).getTime());

  console.log('Parsed UC headers. Total:', results.length);
  console.log('Earliest date:', results[0].payBegin, 'Advice:', results[0].adviceNo);
  console.log('Latest date:', results[results.length - 1].payBegin, 'Advice:', results[results.length - 1].adviceNo);
}

inspectAllUc().catch(console.error);
