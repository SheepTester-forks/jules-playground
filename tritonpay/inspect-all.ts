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
    const textResult = await parser.getText();
    await parser.destroy();

    console.log(`========================================`);
    console.log(`FILE: ${file}`);
    console.log(`Pages: ${textResult.total}`);
    
    // Extract Statement Summary block
    const summaryMatch = textResult.text.match(/STATEMENT SUMMARY[\s\S]*?(?=IMPORTANT MESSAGE|-- 1 of)/i);
    if (summaryMatch) {
      console.log('SUMMARY:');
      console.log(summaryMatch[0].trim());
    } else {
      console.log('NO SUMMARY MATCH FOUND!');
    }

    // Extract Statement Details block
    const detailsMatch = textResult.text.match(/Statement Details[\s\S]*?(?=Make checks payable|STATEMENT SUMMARY)/i);
    if (detailsMatch) {
      console.log('DETAILS:');
      console.log(detailsMatch[0].trim());
    } else {
      console.log('NO DETAILS MATCH FOUND!');
    }
  }
}

main().catch(console.error);
