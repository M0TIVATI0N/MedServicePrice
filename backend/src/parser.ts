import { RawRecord, OfferRecord, PriceHistory, PriceSubscriptionModel } from "./db";
import { fetchSourceRecords } from "./parsers";
import { normalizeService } from "./normalizer";
import { SortOrder } from "mongoose";
import crypto from "crypto";

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

/**
 * Fetch detailed price history for a specific clinic and service
 */
export async function fetchClinicServicePriceHistory(
    clinicId: string,
    serviceId: string,
    limit = 50
) {
    return PriceHistory.find({
        clinic_id: clinicId,
        service_id: serviceId
    })
        .sort({ parsed_at: -1 })
        .limit(limit)
        .lean();
}

/**
 * Compare multiple clinics for the same service
 */
export async function compareClinics(
    serviceId: string,
    clinicIds?: string[]
) {
    const query: any = { service_id: serviceId };
    
    if (clinicIds && clinicIds.length > 0) {
        query.clinic_id = { $in: clinicIds };
    }

    const offers = await OfferRecord.find(query)
        .sort({ price_kzt: 1 })
        .lean();

    // Group by clinic and get latest offer per clinic
    const clinicMap = new Map<string, any>();
    
    for (const offer of offers) {
        if (!clinicMap.has(offer.clinic_id)) {
            clinicMap.set(offer.clinic_id, {
                clinic_id: offer.clinic_id,
                clinic_name: offer.clinic_name,
                city: offer.city,
                address: offer.address,
                phone: offer.phone,
                service_name_norm: offer.service_name_norm,
                price_kzt: offer.price_kzt,
                parsed_at: offer.parsed_at,
                location: offer.location
            });
        }
    }

    const comparisonData = Array.from(clinicMap.values())
        .sort((a, b) => a.price_kzt - b.price_kzt);

    // Calculate statistics
    const prices = comparisonData.map(c => c.price_kzt);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return {
        service_id: serviceId,
        service_name: comparisonData[0]?.service_name_norm || '',
        total_clinics: comparisonData.length,
        price_range: {
            min: minPrice,
            max: maxPrice,
            average: Math.round(avgPrice),
            difference: maxPrice - minPrice
        },
        clinics: comparisonData.map(clinic => ({
            ...clinic,
            is_cheapest: clinic.price_kzt === minPrice,
            is_most_expensive: clinic.price_kzt === maxPrice,
            deviation_from_avg: Math.round(((clinic.price_kzt - avgPrice) / avgPrice) * 100) + '%'
        }))
    };
}

export async function fetchUnmatchedQueue() {
    return OfferRecord.find({
        service_id: /^unmatched-/
    }).lean();
}

/* -------------------- SUBSCRIPTION FUNCTIONS -------------------- */

export async function createPriceSubscription(
    userEmail: string,
    clinicId: string,
    clinicName: string,
    serviceId: string,
    serviceName: string,
    targetPrice?: number
): Promise<any> {
    const subscriptionId = crypto
        .createHash('sha256')
        .update(`${userEmail}|${clinicId}|${serviceId}`)
        .digest('hex');

    // Get current price
    const currentOffer = await OfferRecord.findOne({
        clinic_id: clinicId,
        service_id: serviceId
    }).sort({ parsed_at: -1 });

    if (!currentOffer) {
        throw new Error('Service not found for this clinic');
    }

    const subscription = await PriceSubscriptionModel.findOneAndUpdate(
        { subscription_id: subscriptionId },
        {
            $set: {
                subscription_id: subscriptionId,
                user_email: userEmail,
                clinic_id: clinicId,
                clinic_name: clinicName,
                service_id: serviceId,
                service_name: serviceName,
                target_price: targetPrice,
                current_price: currentOffer.price_kzt,
                is_active: true,
                created_at: new Date()
            }
        },
        { upsert: true, new: true }
    );

    return subscription;
}

export async function getUserSubscriptions(userEmail: string) {
    return PriceSubscriptionModel.find({
        user_email: userEmail,
        is_active: true
    }).sort({ created_at: -1 }).lean();
}

export async function checkPriceChanges(): Promise<{ notifications: any[] }> {
    const activeSubscriptions = await PriceSubscriptionModel.find({
        is_active: true
    });

    const notifications: any[] = [];

    for (const sub of activeSubscriptions) {
        const currentOffer = await OfferRecord.findOne({
            clinic_id: sub.clinic_id,
            service_id: sub.service_id
        }).sort({ parsed_at: -1 });

        if (!currentOffer) continue;

        const oldPrice = sub.current_price;
        const newPrice = currentOffer.price_kzt;

        if (oldPrice !== newPrice) {
            // Check if target price is met
            const shouldNotify = !sub.target_price || newPrice <= sub.target_price;

            if (shouldNotify) {
                notifications.push({
                    subscription_id: sub.subscription_id,
                    user_email: sub.user_email,
                    clinic_name: sub.clinic_name,
                    service_name: sub.service_name,
                    old_price: oldPrice,
                    new_price: newPrice,
                    price_change: newPrice - oldPrice,
                    percentage_change: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2) + '%'
                });

                // Update subscription
                await PriceSubscriptionModel.updateOne(
                    { subscription_id: sub.subscription_id },
                    {
                        $set: {
                            current_price: newPrice,
                            last_notified_at: new Date()
                        }
                    }
                );
            } else {
                // Just update current price without notification
                await PriceSubscriptionModel.updateOne(
                    { subscription_id: sub.subscription_id },
                    {
                        $set: {
                            current_price: newPrice
                        }
                    }
                );
            }
        }
    }

    return { notifications };
}

export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
    const result = await PriceSubscriptionModel.updateOne(
        { subscription_id: subscriptionId },
        { $set: { is_active: false } }
    );
    return result.modifiedCount > 0;
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