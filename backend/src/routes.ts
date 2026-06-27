import { Router, Request, Response } from "express";
import {
    fetchClinics,
    fetchNormalizedOffers,
    fetchUnmatchedQueue,
    fetchRawData,
    fetchPriceHistory,
    fetchParseLogs,
    runParser,
    activeOfferFilter,
    DATA_FRESHNESS_DAYS
} from "./parser";

import { serviceCatalog, serviceSynonyms, resolveCatalogQuery } from "./service-catalog";
import { getKdlCityNames } from "./parsers/kdlCities";
import { OfferRecord } from "./db";

const router = Router();

/* -------------------- CACHE -------------------- */

const CACHE_TTL = 5 * 60_000;

interface CacheEntry<T> {
    data: T;
    ts: number;
}

function makeCache<T>() {
    let entry: CacheEntry<T> | null = null;
    return {
        get(): T | null {
            return entry && Date.now() - entry.ts < CACHE_TTL ? entry.data : null;
        },
        set(data: T) {
            entry = { data, ts: Date.now() };
        },
        invalidate() {
            entry = null;
        }
    };
}

const citiesCache     = makeCache<string[]>();
const categoriesCache = makeCache<string[]>();
const servicesCache   = new Map<string, CacheEntry<any>>();

function getCachedServices(key: string): any | null {
    const entry = servicesCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
        servicesCache.delete(key);
        return null;
    }
    return entry.data;
}

function setCachedServices(key: string, data: any) {
    if (servicesCache.size > 500) servicesCache.clear();
    servicesCache.set(key, { data, ts: Date.now() });
}

function invalidateAllCaches() {
    citiesCache.invalidate();
    categoriesCache.invalidate();
    servicesCache.clear();
}

/* -------------------- HELPERS -------------------- */

function parseIntSafe(val: any, fallback: number, min?: number, max?: number) {
    let n = Number(val);
    if (!Number.isFinite(n)) n = fallback;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
}

function parseFloatSafe(val: any): number | null {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
}

function haversineKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const KNOWN_CATEGORIES: string[] = [
    "диагностика",
    "лаборатория",
    "прочее",
    "процедура",
    "приём врача"
];

function buildServiceFilters(req: Request) {
    const query        = String(req.query.query    ?? "").trim();
    const city         = String(req.query.city     ?? "").trim();
    const category     = String(req.query.category ?? "").trim();
    const priceMin     = parseIntSafe(req.query.priceMin, 0, 0);
    const priceMax     = parseIntSafe(req.query.priceMax, Number.MAX_SAFE_INTEGER, 0);
    const ratingMin    = parseFloatSafe(req.query.ratingMin);
    const onlineOnly   = req.query.online_booking === "true";
    const serviceId    = String(req.query.service_id ?? "").trim();

    const filters: Record<string, any> = {};

    if (priceMin > 0 || priceMax < Number.MAX_SAFE_INTEGER) {
        filters.price_kzt = { $gte: priceMin, $lte: priceMax };
    }
    if (city)         filters.city = city;
    if (category)     filters.category = category;
    if (serviceId)    filters.service_id = serviceId;
    if (ratingMin !== null && ratingMin > 0) {
        filters.rating = { $gte: ratingMin };
    }
    if (onlineOnly) {
        filters.online_booking = true;
    }
    if (query) {
        const catalogMatches = resolveCatalogQuery(query);
        if (catalogMatches.length === 1) {
            filters.service_id = catalogMatches[0].service_id;
        } else if (catalogMatches.length > 1) {
            filters.service_id = { $in: catalogMatches.map(s => s.service_id) };
        } else {
            filters.$or = [
                { service_name_norm: { $regex: query, $options: "i" } },
                { service_name_raw:  { $regex: query, $options: "i" } }
            ];
        }
    }

    return { filters, query, city, category, priceMin, priceMax, ratingMin, onlineOnly, serviceId };
}

/* -------------------- HEALTH -------------------- */

router.get("/health", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        data_freshness_days: DATA_FRESHNESS_DAYS
    });
});

/* -------------------- CATALOG -------------------- */

router.get("/catalog", (_req: Request, res: Response) => {
    res.json(
        serviceCatalog.map(s => ({
            ...s,
            synonyms: serviceSynonyms[s.service_name_norm] ?? []
        }))
    );
});

router.get("/catalog/search", (req: Request, res: Response) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    const limit = parseIntSafe(req.query.limit, 12, 1, 50);

    if (!q) {
        return res.json(serviceCatalog.slice(0, limit));
    }

    const results = serviceCatalog.filter(s => {
        const name = s.service_name_norm.toLowerCase();
        if (name.includes(q)) return true;
        const syns = serviceSynonyms[s.service_name_norm] ?? [];
        return syns.some(syn => syn.toLowerCase().includes(q));
    });

    res.json(results.slice(0, limit));
});

/* -------------------- CITIES -------------------- */

router.get("/cities", async (_req: Request, res: Response) => {
    try {
        const cached = citiesCache.get();
        if (cached) return res.json(cached);

        const kdlCities = await getKdlCityNames();
        const fromDb = await OfferRecord.distinct(
            "city",
            activeOfferFilter({ city: { $nin: [null, ""] } })
        ) as string[];

        const result = Array.from(new Set([...kdlCities, ...fromDb]))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "ru"));

        citiesCache.set(result);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- CATEGORIES -------------------- */

router.get("/categories", async (req: Request, res: Response) => {
    try {
        const city = String(req.query.city ?? "").trim();

        if (city) {
            const fromDb = await OfferRecord.distinct("category", activeOfferFilter({
                city,
                category: { $nin: [null, ""] }
            }));
            const result = (fromDb as string[])
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, "ru"));
            return res.json(result.length ? result : KNOWN_CATEGORIES);
        }

        const cached = categoriesCache.get();
        if (cached) return res.json(cached);

        const fromDb = await OfferRecord.distinct("category", activeOfferFilter({ category: { $nin: [null, ""] } }));
        const merged = Array.from(new Set([...KNOWN_CATEGORIES, ...(fromDb as string[])]))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "ru"));

        categoriesCache.set(merged);
        res.json(merged);
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- SERVICES -------------------- */

router.get("/services", async (req: Request, res: Response) => {
    try {
        const page      = parseIntSafe(req.query.page,  1,  1);
        const limit     = parseIntSafe(req.query.limit, 50, 1, 200);
        const sort      = String(req.query.sort ?? "price_asc");
        const userLat   = parseFloatSafe(req.query.lat);
        const userLng   = parseFloatSafe(req.query.lng);

        const { filters, city } = buildServiceFilters(req);

        if (!city) {
            return res.json({
                count: 0,
                page,
                limit,
                data: [],
                message: "Выберите город для поиска"
            });
        }

        const cacheKey = `${JSON.stringify(filters)}|${sort}|${userLat}|${userLng}|${page}|${limit}`;
        const cached = getCachedServices(cacheKey);
        if (cached) return res.json(cached);

        const activeFilters = activeOfferFilter(filters);

        if (sort === "distance" && userLat !== null && userLng !== null) {
            const all = await OfferRecord.find(activeFilters).lean();
            const withDist = all
                .map(o => ({
                    ...o,
                    distance_km: o.location
                        ? haversineKm(userLat, userLng, o.location.lat, o.location.lng)
                        : Number.MAX_SAFE_INTEGER
                }))
                .sort((a, b) => a.distance_km - b.distance_km);

            const total = withDist.length;
            const data = withDist.slice((page - 1) * limit, page * limit);
            const result = { count: total, page, limit, data };
            setCachedServices(cacheKey, result);
            return res.json(result);
        }

        const sortField: Record<string, 1 | -1> =
            sort === "price_desc"  ? { price_kzt: -1 } :
            sort === "date_desc"   ? { parsed_at: -1 } :
            sort === "date_asc"    ? { parsed_at: 1 } :
            sort === "rating_desc" ? { rating: -1 } :
                                   { price_kzt: 1 };

        const [offers, total] = await Promise.all([
            fetchNormalizedOffers(activeFilters, sortField, page, limit),
            OfferRecord.countDocuments(activeFilters)
        ]);

        const result = { count: total, page, limit, data: offers };
        setCachedServices(cacheKey, result);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- COMPARE -------------------- */

router.get("/compare", async (req: Request, res: Response) => {
    try {
        const serviceId = String(req.query.service_id ?? "").trim();
        const clinicIds = String(req.query.clinic_ids ?? "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);

        if (!serviceId || clinicIds.length < 2) {
            return res.status(400).json({
                error: "Provide service_id and at least 2 clinic_ids (comma-separated)"
            });
        }

        const offers = await OfferRecord.find(
            activeOfferFilter({
                service_id: serviceId,
                clinic_id: { $in: clinicIds }
            })
        )
            .sort({ price_kzt: 1 })
            .lean();

        res.json({ service_id: serviceId, clinics: offers });
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- CLINICS -------------------- */

router.get("/clinics", async (req: Request, res: Response) => {
    try {
        const city = String(req.query.city ?? "").trim();
        if (!city) {
            return res.json([]);
        }

        const query = String(req.query.query ?? "").trim();
        const serviceId = String(req.query.service_id ?? "").trim();

        const filters: Record<string, any> = {};
        if (city) filters.city = city;
        if (serviceId) {
            filters.service_id = serviceId;
        } else if (query) {
            const catalogMatches = resolveCatalogQuery(query);
            if (catalogMatches.length === 1) {
                filters.service_id = catalogMatches[0].service_id;
            } else if (catalogMatches.length > 1) {
                filters.service_id = { $in: catalogMatches.map(s => s.service_id) };
            } else {
                filters.$or = [
                    { service_name_norm: { $regex: query, $options: "i" } },
                    { service_name_raw: { $regex: query, $options: "i" } }
                ];
            }
        }

        const clinics = await fetchClinics(filters);
        res.json(clinics);
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

router.get("/clinics/:id", async (req: Request, res: Response) => {
    try {
        const clinic_id = req.params.id;
        const offers = await OfferRecord.find(activeOfferFilter({ clinic_id }))
            .sort({ price_kzt: 1 })
            .lean();

        if (!offers.length) {
            return res.status(404).json({ error: "Clinic not found" });
        }

        const first = offers[0];
        res.json({
            clinic_id:     first.clinic_id,
            clinic_name:   first.clinic_name,
            city:          first.city,
            address:       first.address,
            phone:         first.phone,
            working_hours: first.working_hours,
            source_url:    first.source_url,
            location:      first.location,
            rating:        first.rating,
            online_booking: first.online_booking,
            services:      offers
        });
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- HISTORY -------------------- */

router.get("/history", async (req: Request, res: Response) => {
    try {
        const clinic_id  = String(req.query.clinic_id  ?? "").trim();
        const service_id = String(req.query.service_id ?? "").trim();
        const limit      = parseIntSafe(req.query.limit, 50, 1, 200);

        if (!clinic_id || !service_id) {
            return res.status(400).json({ error: "clinic_id and service_id are required" });
        }

        const history = await fetchPriceHistory(clinic_id, service_id, limit);
        res.json(history);
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- PARSE -------------------- */

router.post("/parse", async (_req: Request, res: Response) => {
    res.json({ status: "parser started" });

    runParser()
        .then(r => {
            invalidateAllCaches();
            console.log("Parser done:", r.total, "records,", r.unmatched, "unmatched");
        })
        .catch(e => console.error("Parser error:", e?.message));
});

router.get("/parse/status", async (_req: Request, res: Response) => {
    try {
        const latest = await fetchParseLogs(1);
        const last = latest[0] ?? null;
        const activeFilter = activeOfferFilter();
        const [activeOffers, clinicCount] = await Promise.all([
            OfferRecord.countDocuments(activeFilter),
            OfferRecord.distinct("clinic_id", activeFilter)
        ]);

        res.json({
            active_offers: activeOffers,
            clinics: clinicCount.length,
            last_log: last,
            freshness_days: DATA_FRESHNESS_DAYS
        });
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

router.get("/parse/logs", async (req: Request, res: Response) => {
    try {
        const limit = parseIntSafe(req.query.limit, 100, 1, 500);
        res.json(await fetchParseLogs(limit));
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- RAW / UNMATCHED -------------------- */

router.get("/raw", async (req: Request, res: Response) => {
    try {
        const limit = parseIntSafe(req.query.limit, 200, 1, 1000);
        res.json(await fetchRawData(limit));
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

router.get("/unmatched", async (_req: Request, res: Response) => {
    try {
        res.json(await fetchUnmatchedQueue());
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

/* -------------------- STATS -------------------- */

router.get("/stats", async (_req: Request, res: Response) => {
    try {
        const activeFilter = activeOfferFilter();
        const [totalOffers, clinics, sources, unmatched] = await Promise.all([
            OfferRecord.countDocuments(activeFilter),
            OfferRecord.distinct("clinic_id", activeFilter),
            OfferRecord.distinct("clinic_name", activeFilter),
            OfferRecord.countDocuments(activeOfferFilter({ service_id: /^unmatched-/ }))
        ]);

        res.json({
            active_offers: totalOffers,
            clinics: clinics.length,
            sources: sources.length,
            catalog_size: serviceCatalog.length,
            unmatched_queue: unmatched,
            freshness_days: DATA_FRESHNESS_DAYS
        });
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Server error" });
    }
});

export default router;
