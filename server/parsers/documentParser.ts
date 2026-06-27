import mammoth from 'mammoth';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// Этот блок автоматически понимает, где он запускается, и не выдает ошибок
const currentSourceUrl = typeof import.meta.url !== 'undefined'
  ? import.meta.url
  : new URL(__filename, 'file:').href;

const require = createRequire(currentSourceUrl);
const pdfParse = require('pdf-parse');

async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function parseDocumentFromUrl(url: string): Promise<string> {
  const buffer = await downloadFile(url);
  if (url.endsWith('.pdf')) {
    const data = await pdfParse(buffer as Buffer);
    return data.text;
  }

  if (url.endsWith('.docx') || url.endsWith('.doc')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString('utf-8');
}

export function extractServicesFromText(text: string): Array<{ title: string; price: number }> {
  const lines = text.split(/\r?\n/);
  const results: Array<{ title: string; price: number }> = [];
  for (const line of lines) {
    const match = line.match(/(.+?)\s+(\d+[\s\d]*)\s*(тг|тенге|₸|KZT)?$/i);
    if (match) {
      const title = match[1].trim();
      const price = Number(match[2].replace(/\s/g, ''));
      if (title && price > 0) {
        results.push({ title, price });
      }
    }
  }
  return results;
}