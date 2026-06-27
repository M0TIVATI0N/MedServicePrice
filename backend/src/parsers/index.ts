import { RawClinicRecord } from '../models';
import { parseKdlPrices } from './kdlParser';
import { parseDoqPrices } from './doqParser';
import { extractServicesFromText, parseDocumentFromUrl } from './documentParser';

let isRunning = false;

export async function fetchSourceRecords(): Promise<RawClinicRecord[]> {
  if (isRunning) {
    console.warn('fetchSourceRecords already running — skip this call');
    return [];
  }

  isRunning = true;

  try {
    console.log('FETCH SOURCE RECORDS START');

    const results = await Promise.allSettled([
      parseKdlPrices(),
      parseDoqPrices()
    ]);

    const records: RawClinicRecord[] = [];

    for (const item of results) {
      if (item.status === 'fulfilled' && Array.isArray(item.value)) {
        records.push(...item.value);
      } else if (item.status === 'rejected') {
        console.error('Parser failed:', item.reason);
      }
    }

    console.log('TOTAL:', records.length);
    return records;
  } finally {
    isRunning = false;
  }
}

export { parseDocumentFromUrl, extractServicesFromText };