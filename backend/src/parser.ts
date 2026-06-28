import { SortOrder } from "mongoose";
import crypto from "crypto";
import { OfferRecord, ParseLog, PriceHistory, RawRecord } from "./db";
import { fetchSourceRecords } from "./parsers";
import { PARSER_REPLACE_DB, PARSER_STORE_RAW } from "./parsers/config";
import { normalizeService } from "./normalizer";
import { sourceFromClinicId } from "./sources";
import { ParseLogEntry, RawClinicRecord } from "./models";

export const DATA_FRESHNESS_DAYS = 30;

/* -------------------- HELPERS -------------------- */

export function freshnessCutoff(): Date {
    const d = new Date();
    d.setDate(d.getDate() - DATA_FRESHNESS_DAYS);
    return d;
}

export function activeOfferFilter(extra: Record<string, unknown> = {}) {
    return {
        ...extra,
        is_active: true,
        parsed_at: { $gte: freshnessCutoff() }
    };
}

function buildRawHash(record: RawClinicRecord): string {
    return crypto
        .createHash("sha256")
        .update(
            [
                record.clinic_id,
                record.source_url,
                record.service_name_raw,
                String(record.price_kzt)
            ].join("|")
        )
        .digest("hex");
}

function offerKey(clinic_id: string, service_id: string, city: string) {
    return `${clinic_id}|${service_id}|${city}`;
}

async function writeParseLogs(entries: ParseLogEntry[]) {
    if (!entries.length) return;
    await ParseLog.insertMany(entries, { ordered: false }).catch(() => undefined);
}

/** Free Atlas M0 quota before writing a fresh dataset */
async function purgeBeforeParse(): Promise<void> {
    if (!PARSER_REPLACE_DB) return;

    console.log("Purging old data to free storage...");

    const cutoff90 = new Date();
    cutoff90.setDate(cutoff90.getDate() - 90);

    await Promise.all([
        RawRecord.deleteMany({}),
        OfferRecord.deleteMany({}),
        PriceHistory.deleteMany({ parsed_at: { $lt: cutoff90 } }),
        ParseLog.deleteMany({})
    ]);

    console.log("Storage purge complete");
}

/* -------------------- READ FUNCTIONS -------------------- */

export async function fetchRawData(limit = 200) {
    return RawRecord.find()
        .sort({ parsed_at: -1 })
        .limit(limit)
        .lean();
}

export async function fetchNormalizedOffers(
    filters: Record<string, any> = {},
    sort: Record<string, SortOrder> = { price_kzt: 1 },
    page = 1,
    limit = 50
) {
    const match = activeOfferFilter(filters);

    const preSort: Record<string, 1 | -1> = {
        price_kzt: 1,
        parsed_at: -1,
        _id: 1
    };

    const sortStage: Record<string, 1 | -1> = {};

    for (const [key, dir] of Object.entries(sort)) {
        sortStage[key] = dir === -1 || dir === "desc" ? -1 : 1;
    }

    if (!sortStage._id) {
        sortStage._id = 1;
    }

    return OfferRecord.aggregate([
        { $match: match },

        { $sort: preSort },

        {
            $group: {
                _id: {
                    clinic_id: "$clinic_id",
                    service_id: "$service_id",
                    city: "$city"
                },
                doc: {
                    $first: "$$ROOT"
                }
            }
        },

        {
            $replaceRoot: {
                newRoot: "$doc"
            }
        },

        { $sort: sortStage },

        { $skip: (page - 1) * limit },

        { $limit: limit }
    ]).exec();
}
export async function countDistinctOffers(
    filters: Record<string, any> = {}
) {
    const result = await OfferRecord.aggregate([
        {
            $match: activeOfferFilter(filters)
        },
        {
            $group: {
                _id: {
                    clinic_id: "$clinic_id",
                    service_id: "$service_id",
                    city: "$city"
                }
            }
        },
        {
            $count: "total"
        }
    ]).exec();

    return result[0]?.total ?? 0;
}

export async function fetchClinics(
    query: Record<string, any> = {},
    limit = 2000
) {
    return OfferRecord.aggregate([
        {
            $match: activeOfferFilter(query)
        },

        {
            $sort: {
                parsed_at: -1,
                _id: 1
            }
        },

        {
            $group: {
                _id: {
                    clinic_id: "$clinic_id",
                    service_id: "$service_id",
                    city: "$city"
                },
                doc: {
                    $first: "$$ROOT"
                }
            }
        },

        {
            $replaceRoot: {
                newRoot: "$doc"
            }
        },

        {
            $group: {
                _id: "$clinic_id",

                clinic_id: {
                    $first: "$clinic_id"
                },

                clinic_name: {
                    $first: "$clinic_name"
                },

                city: {
                    $first: "$city"
                },

                address: {
                    $first: "$address"
                },

                phone: {
                    $first: "$phone"
                },

                working_hours: {
                    $first: "$working_hours"
                },

                source_url: {
                    $first: "$source_url"
                },

                location: {
                    $first: "$location"
                },

                rating: {
                    $first: "$rating"
                },

                online_booking: {
                    $first: "$online_booking"
                },

                service_count: {
                    $sum: 1
                },

                min_price: {
                    $min: "$price_kzt"
                }
            }
        },

        {
            $sort: {
                clinic_name: 1
            }
        },

        {
            $limit: limit
        }
    ]).exec();
}
export async function fetchUnmatchedQueue() {
    return OfferRecord.find(
        activeOfferFilter({ service_id: /^unmatched-/ })
    ).lean();
}

export async function fetchPriceHistory(
    clinic_id: string,
    service_id: string,
    limit = 50
) {
    return PriceHistory.find({ clinic_id, service_id })
        .sort({ parsed_at: -1 })
        .limit(limit)
        .lean();
}

export async function fetchParseLogs(limit = 100) {
    return ParseLog.find()
        .sort({ parsed_at: -1 })
        .limit(limit)
        .lean();
}

/* -------------------- CORE PARSER -------------------- */

const BATCH_SIZE = 2000;

export interface RunParserResult {
    parsed_at: string;
    total: number;
    unmatched: number;
    fetchMs: number;
    errors: Array<{ source: string; message: string }>;
}

export async function runParser(): Promise<RunParserResult> {
    console.log("PARSER START");

    await purgeBeforeParse();

    const parsedAt = new Date();
    const logEntries: ParseLogEntry[] = [];
    const { records: sourceRecords, errors, fetchMs } = await fetchSourceRecords();

    for (const err of errors) {
        logEntries.push({
            source: err.source,
            level: "error",
            message: err.message,
            parsed_at: parsedAt
        });
    }

    logEntries.push({
        source: "parser",
        level: "info",
        message: `Fetched ${sourceRecords.length} records (store_raw=${PARSER_STORE_RAW})`,
        parsed_at: parsedAt
    });

    console.log("SOURCE RECORDS:", sourceRecords.length);

    const existingPrices = new Map<string, number>();

    if (!PARSER_REPLACE_DB) {
        const cursor = OfferRecord.find(
            {},
            { clinic_id: 1, service_id: 1, city: 1, price_kzt: 1 }
        )
            .lean()
            .cursor();

        for await (const doc of cursor) {
            existingPrices.set(
                offerKey(doc.clinic_id, doc.service_id, doc.city),
                doc.price_kzt
            );
        }
    }

    let processed = 0;
    let unmatched = 0;
    let rawOps: any[] = [];
    let offerOps: any[] = [];
    let historyOps: any[] = [];

    const flushRaw = async (ops: any[]) => {
        if (!ops.length) return;
        await RawRecord.bulkWrite(ops, { ordered: false }).catch(onBulkError);
    };

    const flushOffers = async (ops: any[]) => {
        if (!ops.length) return;
        await OfferRecord.bulkWrite(ops, { ordered: false }).catch(onBulkError);
    };

    const flushHistory = async (ops: any[]) => {
        if (!ops.length) return;
        await PriceHistory.bulkWrite(ops, { ordered: false }).catch(onBulkError);
    };

    const onBulkError = (e: any) => {
        logEntries.push({
            source: "parser",
            level: "error",
            message: `Bulk write failed: ${e?.message}`,
            parsed_at: parsedAt
        });
    };

    for (let i = 0; i < sourceRecords.length; i++) {
        const raw = { ...sourceRecords[i], parsed_at: parsedAt };
        processed++;

        const raw_hash = buildRawHash(raw);
        raw.raw_hash = raw_hash;

        if (PARSER_STORE_RAW) {
            rawOps.push({
                updateOne: {
                    filter: { raw_hash },
                    update: { $set: { ...raw, raw_hash } },
                    upsert: true
                }
            });
        }

        const offer = normalizeService(raw);
        offer.parsed_at = parsedAt;
        offer.is_active = true;
        const sourceTag = sourceFromClinicId(offer.clinic_id);

        if (offer.service_id.startsWith("unmatched-")) {
            unmatched++;
        }

        const key = offerKey(offer.clinic_id, offer.service_id, offer.city);
        const prevPrice = existingPrices.get(key);
        if (prevPrice === undefined || prevPrice !== offer.price_kzt) {
            historyOps.push({
                insertOne: {
                    document: {
                        clinic_id: offer.clinic_id,
                        service_id: offer.service_id,
                        clinic_name: offer.clinic_name,
                        service_name_norm: offer.service_name_norm,
                        price_kzt: offer.price_kzt,
                        previous_price_kzt: prevPrice,
                        parsed_at: parsedAt,
                        source_url: offer.source_url
                    }
                }
            });
        }
        existingPrices.set(key, offer.price_kzt);

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
                        is_active: true,
                        location: offer.location,
                        rating: offer.rating,
                        online_booking: offer.online_booking,
                        source: sourceTag ?? undefined
                    }
                },
                upsert: true
            }
        });

        if (PARSER_STORE_RAW && rawOps.length >= BATCH_SIZE) {
            await flushRaw(rawOps);
            rawOps = [];
        }
        if (offerOps.length >= BATCH_SIZE) {
            await flushOffers(offerOps);
            offerOps = [];
        }
        if (historyOps.length >= BATCH_SIZE) {
            await flushHistory(historyOps);
            historyOps = [];
        }
    }

    if (PARSER_STORE_RAW) await flushRaw(rawOps);
    await flushOffers(offerOps);
    await flushHistory(historyOps);

    if (!PARSER_REPLACE_DB) {
        await OfferRecord.updateMany(
            { parsed_at: { $lt: parsedAt } },
            { $set: { is_active: false } }
        );
    }

    if (PARSER_STORE_RAW) {
        const cutoff90 = new Date();
        cutoff90.setDate(cutoff90.getDate() - 90);
        await RawRecord.deleteMany({ parsed_at: { $lt: cutoff90 } }).catch(() => undefined);
    }

    logEntries.push({
        source: "parser",
        level: "info",
        message: `Done: ${processed} processed, ${unmatched} unmatched`,
        parsed_at: parsedAt
    });

    await writeParseLogs(logEntries);

    console.log(`processed: ${processed}, unmatched: ${unmatched}`);

    return {
        parsed_at: parsedAt.toISOString(),
        total: processed,
        unmatched,
        fetchMs,
        errors
    };
}
