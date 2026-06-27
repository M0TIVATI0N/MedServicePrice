import { RawRecord, OfferRecord, PriceHistory } from "./db";
import { fetchSourceRecords } from "./parsers";
import { normalizeService } from "./normalizer";
import { SortOrder } from "mongoose";

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
                _id: "$clinic_id",
                clinic_id: { $first: "$clinic_id" },
                clinic_name: { $first: "$clinic_name" },
                city: { $first: "$city" },
                address: { $first: "$address" },
                phone: { $first: "$phone" },
                working_hours: { $first: "$working_hours" },
                source_url: { $first: "$source_url" },
                location: { $first: "$location" },
                services: { $push: "$$ROOT" }
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

/* -------------------- CORE PARSER (OPTIMIZED) -------------------- */

export async function runParser() {
    console.log("PARSER MODULE LOADED");

    console.time("fetch");
    const sourceRecords = await fetchSourceRecords();
    console.timeEnd("fetch");

    console.log("SOURCE RECORDS:", sourceRecords.length);

    console.time("normalize");

    const BATCH_SIZE = 3000; // slightly smaller = faster flush cycles

    let processed = 0;
    let unmatched = 0;

    let rawOps: any[] = [];
    let offerOps: any[] = [];
    let historyOps: any[] = [];

    const flush = async () => {
        const tasks: Promise<any>[] = [];

        if (rawOps.length) {
            tasks.push(
                RawRecord.bulkWrite(rawOps, {
                    ordered: false,
                    writeConcern: { w: 0 }
                })
            );
        }

        if (offerOps.length) {
            tasks.push(
                OfferRecord.bulkWrite(offerOps, {
                    ordered: false,
                    writeConcern: { w: 0 }
                })
            );
        }

        if (historyOps.length) {
            tasks.push(
                PriceHistory.bulkWrite(historyOps, {
                    ordered: false,
                    writeConcern: { w: 0 }
                })
            );
        }

        rawOps = [];
        offerOps = [];
        historyOps = [];

        if (tasks.length) {
            await Promise.all(tasks);
        }
    };

    for (let i = 0; i < sourceRecords.length; i++) {
        const raw = sourceRecords[i];
        processed++;

        const parsedAt =
            raw.parsed_at instanceof Date
                ? raw.parsed_at
                : new Date(raw.parsed_at);

        /* -------------------- FASTER HASH -------------------- */
        const raw_hash =
            raw.clinic_id +
            "|" +
            raw.source_url +
            "|" +
            raw.service_name_raw +
            "|" +
            raw.price_kzt;

        /* -------------------- RAW UPSERT -------------------- */
        rawOps.push({
            updateOne: {
                filter: { raw_hash },
                update: {
                    $set: {
                        clinic_id: raw.clinic_id,
                        clinic_name: raw.clinic_name,
                        city: raw.city,
                        address: raw.address,
                        phone: raw.phone,
                        working_hours: raw.working_hours,
                        source_url: raw.source_url,
                        service_name_raw: raw.service_name_raw,
                        category: raw.category,
                        price_kzt: raw.price_kzt,
                        currency: raw.currency,
                        duration_days: raw.duration_days,
                        parsed_at: parsedAt,
                        is_active: raw.is_active,
                        location: raw.location,
                        raw_hash
                    }
                },
                upsert: true
            }
        });

        const offer = normalizeService(raw);

        if (offer.service_id.charCodeAt(0) === 117) {
            unmatched++;
        }

        offer.parsed_at = parsedAt;

        /* -------------------- OFFER UPSERT -------------------- */
        offerOps.push({
            updateOne: {
                filter: {
                    clinic_id: offer.clinic_id,
                    service_id: offer.service_id,
                    city: offer.city
                },
                update: {
                    $set: {
                        clinic_id: offer.clinic_id,
                        clinic_name: offer.clinic_name,
                        city: offer.city,
                        address: offer.address,
                        phone: offer.phone,
                        working_hours: offer.working_hours,
                        source_url: offer.source_url,
                        service_id: offer.service_id,
                        service_name_raw: offer.service_name_raw,
                        service_name_norm: offer.service_name_norm,
                        category: offer.category,
                        price_kzt: offer.price_kzt,
                        currency: offer.currency,
                        duration_days: offer.duration_days,
                        parsed_at: parsedAt,
                        is_active: offer.is_active,
                        location: offer.location
                    }
                },
                upsert: true
            }
        });

        /* -------------------- HISTORY (lightweight insert) -------------------- */
        historyOps.push({
            insertOne: {
                document: {
                    clinic_id: offer.clinic_id,
                    service_id: offer.service_id,
                    clinic_name: offer.clinic_name,
                    service_name_norm: offer.service_name_norm,
                    price_kzt: offer.price_kzt,
                    parsed_at: parsedAt,
                    source_url: offer.source_url
                }
            }
        });

        /* -------------------- FLUSH CONTROL -------------------- */
        if (rawOps.length >= BATCH_SIZE) {
            await flush();
        }
    }

    await flush();

    console.timeEnd("normalize");

    return {
        parsed_at: new Date().toISOString(),
        total: processed,
        unmatched,
        errors: []
    };
}