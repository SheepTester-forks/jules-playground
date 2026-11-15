import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function scanAllUcRows() {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  const allEarningsDesc = new Set<string>();
  const allTaxesDesc = new Set<string>();
  const allBeforeTaxDesc = new Set<string>();
  const allAfterTaxDesc = new Set<string>();
  const allBenefitsDesc = new Set<string>();

  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;

    // We can also parse lines between headers
    // Let's inspect what lines appear between HOURS AND EARNINGS and TAXES
    await parser.destroy();
  }
}
