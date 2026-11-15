import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

async function findFilesWithText(textToFind: string) {
  const dir = '/mnt/c/Users/seant/Downloads/ucpath pay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  for (const file of files) {
    const dataBuffer = fs.readFileSync(path.join(dir, file));
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    if (textResult.text.includes(textToFind)) {
      console.log(`Found "${textToFind}" in ${file}`);
      await parser.destroy();
      return file;
    }
    await parser.destroy();
  }
  return null;
}

async function main() {
  await findFilesWithText('Evening Shift Differ');
  await findFilesWithText('System BR Dues');
  await findFilesWithText('Holiday-Regular Hour');
}

main().catch(console.error);
