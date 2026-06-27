import { Router, Request, Response } from "express";
import {
    fetchClinics,
    fetchNormalizedOffers,
    fetchPriceHistory,
    fetchRawData,
    fetchUnmatchedQueue,
    runParser
} from "./parser";

import { serviceCatalog } from "./service-catalog";
import { OfferRecord } from "./db";

const router = Router();

/* -------------------- SIMPLE CACHE (lightweight optimization) -------------------- */

let citiesCache: { data: string[]; ts: number } | null = null;
let categoriesCache: { data: string[]; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

/* -------------------- HEALTH -------------------- */

router.get("/health", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

/* -------------------- CATALOG -------------------- */

router.get("/catalog", (_req: Request, res: Response) => {
    res.json(serviceCatalog);
});

/* -------------------- CITIES (OPTIMIZED) -------------------- */

router.get("/cities", async (_req: Request, res: Response) => {
    const now = Date.now();

    if (citiesCache && now - citiesCache.ts < CACHE_TTL) {
        return res.json(citiesCache.data);
    }

    const cities = await OfferRecord.distinct("city", {
        city: { $ne: null }
    });

    const result = cities
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b, "ru"));

    citiesCache = { data: result, ts: now };

    res.json(result);
});

/* -------------------- CATEGORIES (OPTIMIZED) -------------------- */

router.get("/categories", async (_req: Request, res: Response) => {
    const now = Date.now();

    if (categoriesCache && now - categoriesCache.ts < CACHE_TTL) {
        return res.json(categoriesCache.data);
    }

    const categories = await OfferRecord.distinct("category", {
        category: { $ne: null }
    });

    const result = categories
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b, "ru"));

    categoriesCache = { data: result, ts: now };

    res.json(result);
});

/* -------------------- SERVICES (MAIN QUERY ENDPOINT) -------------------- */

router.get("/services", async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    const query = String(req.query.query ?? "").trim();
    const city = String(req.query.city ?? "").trim();
    const category = String(req.query.category ?? "").trim();

    const priceMin = Number(req.query.priceMin ?? 0);
    const priceMax = Number(req.query.priceMax ?? Number.MAX_SAFE_INTEGER);

    const sort = req.query.sort === "price_desc" ? -1 : 1;

    const filters: any = {
        price_kzt: {
            $gte: priceMin,
            $lte: priceMax
        }
    };

    if (query) {
        filters.$or = [
            { service_name_norm: { $regex: query, $options: "i" } },
            { service_name_raw: { $regex: query, $options: "i" } },
            { clinic_name: { $regex: query, $options: "i" } },
            { city: { $regex: query, $options: "i" } },
            { address: { $regex: query, $options: "i" } },
            { category: { $regex: query, $options: "i" } }
        ];
    }

    if (city) {
        filters.city = { $regex: city, $options: "i" };
    }

    if (category) {
        filters.category = { $regex: category, $options: "i" };
    }

    const offers = await fetchNormalizedOffers(
        filters,
        { price_kzt: sort as 1 | -1 },
        page,
        limit
    );

    res.json({
        count: offers.length,
        data: offers
    });
});

/* -------------------- CLINICS -------------------- */

router.get("/clinics", async (req: Request, res: Response) => {
    const city = String(req.query.city ?? "").trim();

    const filters: Record<string, any> = {};

    if (city) {
        filters.city = {
            $regex: city,
            $options: "i"
        };
    }

    const clinics = await fetchClinics(filters);

    res.json(clinics);
});

/* -------------------- PARSE -------------------- */

router.post("/parse", async (_req: Request, res: Response) => {
    res.json({ status: "parser started in background" });

    runParser()
        .then((result) => console.log("Parser finished:", result))
        .catch((err) => console.error("Parser error:", err));
});

/* -------------------- RAW -------------------- */

router.get("/raw", async (_req: Request, res: Response) => {
    res.json(await fetchRawData());
});

/* -------------------- UNMATCHED -------------------- */

router.get("/unmatched", async (_req: Request, res: Response) => {
    res.json(await fetchUnmatchedQueue());
});

/* -------------------- HISTORY -------------------- */

router.get("/history", async (req: Request, res: Response) => {
    const clinic_id = String(req.query.clinic_id ?? "").trim();
    const service_id = String(req.query.service_id ?? "").trim();

    const filters: any = {};

    if (clinic_id) filters.clinic_id = clinic_id;
    if (service_id) filters.service_id = service_id;

    const history = await fetchPriceHistory(filters, 30);

    res.json(history);
});

export default router;