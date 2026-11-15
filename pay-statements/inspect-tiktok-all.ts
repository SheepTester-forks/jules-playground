import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

function maskMoney(text: string): string {
  return text.replace(/\$?\b\d{1,3}(,\d{3})*(\.\d{2})\b/g, '[NUM]');
}

async function inspectTikTokFiles() {
  const dir = '/mnt/c/Users/seant/Downloads/tiktok pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;

    console.log(`\n=================== FILE: ${file} ===================`);
    console.log(`Length: ${text.length}`);
    console.log(maskMoney(text));

    await parser.destroy();
  }
}

inspectTikTokFiles().catch(console.error);
