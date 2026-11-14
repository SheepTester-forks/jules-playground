import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

interface StatementSummary {
  file: string;
  statementDate: string;
  dueDate: string;
  studentId: string;
  previousBalance: string;
  currentBalance: string;
  totalDue: string;
}

async function main() {
  const dir = '/mnt/c/Users/seant/Downloads/tritonpay statements';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

  const summaries: StatementSummary[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    await parser.destroy();

    const text = textResult.text;
    const stmtDateMatch = text.match(/Statement Date\s+(\d{2}\/\d{2}\/\d{4})/i);
    const dueDateMatch = text.match(/Due Date\s+(?:Historical Bill Import-\s+)?(\d{2}\/\d{2}\/\d{4})/i);
    const pidMatch = text.match(/Student ID \(PID\)\s+([A-Z0-9]+)/i);
    const prevMatch = text.match(/Previous Account Balance\s+([-$]?\s*[\d,]+\.\d{2})/i);
    const currMatch = text.match(/Current Account Balance\s+([-$]?\s*[\d,]+\.\d{2})/i);
    const totalMatch = text.match(/TOTAL DUE\s+([-$]?\s*[\d,]+\.\d{2})/i);

    summaries.push({
      file,
      statementDate: stmtDateMatch ? stmtDateMatch[1] : 'UNKNOWN',
      dueDate: dueDateMatch ? dueDateMatch[1] : 'UNKNOWN',
      studentId: pidMatch ? pidMatch[1] : 'UNKNOWN',
      previousBalance: prevMatch ? prevMatch[1].replace(/\s+/g, '') : 'UNKNOWN',
      currentBalance: currMatch ? currMatch[1].replace(/\s+/g, '') : 'UNKNOWN',
      totalDue: totalMatch ? totalMatch[1].replace(/\s+/g, '') : 'UNKNOWN',
    });
  }

  // Sort summaries chronologically by statementDate
  summaries.sort((a, b) => new Date(a.statementDate).getTime() - new Date(b.statementDate).getTime());

  console.table(summaries);
}

main().catch(console.error);
