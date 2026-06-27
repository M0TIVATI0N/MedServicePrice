import { RawClinicRecord } from '../models';
import { parseKdlPrices } from './kdlParser';
import { parseDoqPrices } from './doqParser';
import { extractServicesFromText, parseDocumentFromUrl } from './documentParser';
console.log("parsers/index.ts loaded");
export async function fetchSourceRecords(): Promise<RawClinicRecord[]> {
    console.log("fetchSourceRecords called");
  const results = await Promise.allSettled([parseKdlPrices(), parseDoqPrices()]);
  console.log("parseKdlPrices called");
  const records: RawClinicRecord[] = [];
  for (const item of results) {
    if (item.status === 'fulfilled') {
      records.push(...item.value);
    }
  }
  return records;
}

export { parseDocumentFromUrl, extractServicesFromText };
