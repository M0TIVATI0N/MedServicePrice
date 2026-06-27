import crypto from 'crypto';
import { RawClinicRecord, ClinicServiceOffer } from './models';
import { normalizeService, getUnmatchedQueue } from './normalizer';
import { RawRecord, OfferRecord, PriceHistory } from './db';
import { fetchSourceRecords } from './parsers';

function getRecordHash(record: RawClinicRecord): string {
  return crypto
    .createHash('sha256')
    .update(`${record.clinic_id}|${record.source_url}|${record.service_name_raw}|${record.price_kzt}`)
    .digest('hex');
}

async function saveRawRecord(raw: RawClinicRecord) {
  const raw_hash = getRecordHash(raw);
  await RawRecord.findOneAndUpdate(
    { raw_hash },
    { ...raw, raw_hash, parsed_at: new Date(raw.parsed_at) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function saveOffer(offer: ClinicServiceOffer) {
  const filter = {
    clinic_id: offer.clinic_id,
    service_id: offer.service_id,
    source_url: offer.source_url
  };
  const existing = await OfferRecord.findOne(filter).lean<ClinicServiceOffer>().exec();
  const offerData = { ...offer, parsed_at: new Date(offer.parsed_at) };

  if (!existing) {
    await OfferRecord.create(offerData);
    await PriceHistory.create({
      clinic_id: offer.clinic_id,
      service_id: offer.service_id,
      clinic_name: offer.clinic_name,
      service_name_norm: offer.service_name_norm,
      price_kzt: offer.price_kzt,
      parsed_at: new Date(offer.parsed_at),
      source_url: offer.source_url
    });
    return;
  }

  if (existing.price_kzt !== offer.price_kzt || existing.is_active !== offer.is_active || existing.service_name_raw !== offer.service_name_raw) {
    await OfferRecord.findOneAndUpdate(filter, offerData, { new: true });
    await PriceHistory.create({
      clinic_id: offer.clinic_id,
      service_id: offer.service_id,
      clinic_name: offer.clinic_name,
      service_name_norm: offer.service_name_norm,
      price_kzt: offer.price_kzt,
      parsed_at: new Date(offer.parsed_at),
      source_url: offer.source_url
    });
  }
}

export async function fetchRawData() {
  return RawRecord.find().sort({ parsed_at: -1 }).limit(200).lean();
}

export async function fetchNormalizedOffers(query: Record<string, any> = {}): Promise<ClinicServiceOffer[]> {
  return OfferRecord.find(query).sort({ price_kzt: 1 }).lean<ClinicServiceOffer[]>();
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

export async function fetchPriceHistory(filters: Record<string, any> = {}, limit = 20) {
  return PriceHistory.find(filters).sort({ parsed_at: -1 }).limit(limit).lean();
}

export async function fetchUnmatchedQueue() {
  return OfferRecord.find({ service_id: /^unmatched-/ }).lean();
}

export async function runParser() {
  const sourceRecords = await fetchSourceRecords();
  console.log("SOURCE RECORDS:", sourceRecords.length);

console.log(sourceRecords.slice(0,5));
  const errors: string[] = [];

for (const raw of sourceRecords) {
    console.log("Processing:", raw.service_name_raw);

    try {
        await saveRawRecord(raw);
        console.log("Saved raw");

        const offer = normalizeService(raw);
        console.log("Normalized:", offer.service_name_norm);

        await saveOffer(offer);
        console.log("Saved offer");
    } catch (err) {
        console.error(err);
    }
}

  const unmatched = await fetchUnmatchedQueue();
  return { parsed_at: new Date().toISOString(), total: sourceRecords.length, unmatched: unmatched.length, errors };
}
