import crypto from 'crypto';
import { RawClinicRecord } from './models';
import { normalizeService } from './normalizer';
import { RawRecord, OfferRecord, PriceHistory } from './db';
import { fetchSourceRecords } from './parsers';
import { SortOrder } from 'mongoose';

function getRecordHash(record: RawClinicRecord): string {
  return crypto
    .createHash('sha256')
    .update(
      `${record.clinic_id}|${record.source_url}|${record.service_name_raw}|${record.price_kzt}`
    )
    .digest('hex');
}

/* -------------------- READ FUNCTIONS -------------------- */

export async function fetchRawData() {
  return RawRecord.find()
    .sort({ parsed_at: -1 })
    .limit(200)
    .lean();
}

export async function fetchNormalizedOffers(
  filters: Record<string, any> = {},
  sort: Record<string, SortOrder> = { price_kzt: 1 },
  page = 1,
  limit = 50
) {
  return OfferRecord.find(filters)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}

export async function fetchClinics(query: Record<string, any> = {}) {
  return OfferRecord.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$clinic_id',
        clinic_id: { $first: '$clinic_id' },
        clinic_name: { $first: '$clinic_name' },
        city: { $first: '$city' },
        address: { $first: '$address' },
        phone: { $first: '$phone' },
        working_hours: { $first: '$working_hours' },
        source_url: { $first: '$source_url' },
        location: { $first: '$location' },
        services: { $push: '$$ROOT' }
      }
    }
  ]).exec();
}

export async function fetchPriceHistory(
  filters: Record<string, any> = {},
  limit = 20
) {
  return PriceHistory.find(filters)
    .sort({ parsed_at: -1 })
    .limit(limit)
    .lean();
}

export async function fetchUnmatchedQueue() {
  return OfferRecord.find({
    service_id: /^unmatched-/
  }).lean();
}

/* -------------------- CORE PARSER -------------------- */

export async function runParser() {
  console.log('PARSER MODULE LOADED');

  const sourceRecords = await fetchSourceRecords();
  console.log('SOURCE RECORDS:', sourceRecords.length);

  const rawOps: any[] = [];
  const offerOps: any[] = [];
  const historyOps: any[] = [];

  let processed = 0;
  let unmatched = 0;

  for (const raw of sourceRecords) {
    try {
      processed++;

      const raw_hash = getRecordHash(raw);

      rawOps.push({
        updateOne: {
          filter: { raw_hash },
          update: {
            $set: {
              ...raw,
              raw_hash,
              parsed_at: new Date(raw.parsed_at)
            }
          },
          upsert: true
        }
      });

      const offer = normalizeService(raw);

      if (offer.service_id.startsWith('unmatched-')) {
        unmatched++;
      }

      const filter = {
        clinic_id: offer.clinic_id,
        service_id: offer.service_id,
        source_url: offer.source_url,
        city: offer.city
      };

      offerOps.push({
        updateOne: {
          filter,
          update: {
            $set: {
              ...offer,
              parsed_at: new Date(offer.parsed_at)
            }
          },
          upsert: true
        }
      });

      historyOps.push({
        insertOne: {
          document: {
            clinic_id: offer.clinic_id,
            service_id: offer.service_id,
            clinic_name: offer.clinic_name,
            service_name_norm: offer.service_name_norm,
            price_kzt: offer.price_kzt,
            parsed_at: new Date(offer.parsed_at),
            source_url: offer.source_url
          }
        }
      });
    } catch (err) {
      console.error('PARSE ERROR:', err);
    }
  }

  try {
    if (rawOps.length) {
      await RawRecord.bulkWrite(rawOps, { ordered: false });
    }

    if (offerOps.length) {
      await OfferRecord.bulkWrite(offerOps, { ordered: false });
    }

    if (historyOps.length) {
      await PriceHistory.bulkWrite(historyOps, { ordered: false });
    }
  } catch (err) {
    console.error('BULK WRITE FAILED:', err);
  }

  console.log('PARSE DONE:', {
    processed,
    unmatched
  });

  return {
    parsed_at: new Date().toISOString(),
    total: processed,
    unmatched,
    errors: []
  };
}