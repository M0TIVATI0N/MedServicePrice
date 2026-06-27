import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";
import { cityLocation } from "../geocoding";
import { KDL_MAX_CITIES, limitCities } from "./config";
import { kdlPricelistUrl, loadKdlCities, KdlCity } from "./kdlCities";

const BASE_URL = "https://www.kdlolymp.kz/api/analysis-data";
const CONCURRENCY = 10;

const dispatcher = new Agent({
    connections: 150,
    pipelining: 1,
    keepAliveTimeout: 60000,
    keepAliveMaxTimeout: 60000,
    bodyTimeout: 15000,
    headersTimeout: 15000
});

const BASE_HEADERS = Object.freeze({
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0"
});

async function fetchPage(city: KdlCity, page: number): Promise<any[] | null> {
    const url =
        BASE_URL +
        "?lang=ru-RU&city_id=" + city.id +
        "&city_slug=" + city.slug +
        "&search=&per-page=500&page=" + page;

    try {
        const res = await fetch(url, {
            dispatcher,
            headers: {
                ...BASE_HEADERS,
                Referer: kdlPricelistUrl(city.slug),
                Cookie: "accepted-city=" + city.id + "; currentCity=" + city.id
            }
        });

        if (!res.ok) return null;

        const json: any = await res.json();
        return Array.isArray(json.data) ? json.data : null;
    } catch {
        return null;
    }
}

function extractFromCategories(
    city: KdlCity,
    parsedAt: Date,
    pricelistUrl: string,
    categories: any[],
    seen: Set<string>,
    out: RawClinicRecord[]
) {
    const clinicId = "kdl-" + city.slug;

    for (let i = 0; i < categories.length; i++) {
        const analysis = categories[i].analysis;
        if (!Array.isArray(analysis)) continue;

        for (let j = 0; j < analysis.length; j++) {
            const item = analysis[j];
            const priceObj = item.price;
            if (!priceObj || priceObj.price == null) continue;

            const title =
                item.translation?.title || item.name || item.slug || "";
            const key = title + "|" + priceObj.price;

            if (seen.has(key)) continue;
            seen.add(key);

            out.push({
                clinic_id: clinicId,
                clinic_name: "KDL",
                city: city.title,
                address: "",
                phone: "",
                working_hours: "",
                source_url: pricelistUrl,
                service_name_raw: title,
                category: "лаборатория",
                price_kzt: priceObj.price,
                currency: "KZT",
                duration_days: priceObj.min_duration ?? 1,
                parsed_at: parsedAt,
                is_active: true,
                location: cityLocation(city.title, clinicId),
                online_booking: true,
                rating: 4.4
            });
        }
    }
}

async function processCity(city: KdlCity, parsedAt: Date): Promise<RawClinicRecord[]> {
    const out: RawClinicRecord[] = [];
    const seen = new Set<string>();
    const pricelistUrl = kdlPricelistUrl(city.slug);

    const categories1 = await fetchPage(city, 1);
    if (!categories1) return out;

    extractFromCategories(city, parsedAt, pricelistUrl, categories1, seen, out);

    const needsPage2 = categories1.some(
        c => Array.isArray(c.analysis) && c.analysis.length === 500
    );

    if (needsPage2) {
        const categories2 = await fetchPage(city, 2);
        if (categories2) {
            extractFromCategories(city, parsedAt, pricelistUrl, categories2, seen, out);
        }
    }

    return out;
}

export async function parseKdlPrices(): Promise<RawClinicRecord[]> {
    const cities = await loadKdlCities();
    console.log("KDL cities available:", cities.length);

    const selected = limitCities(cities, KDL_MAX_CITIES);
    console.log("KDL parsing", selected.length, "cities");

    const parsedAt = new Date();
    const allResults: RawClinicRecord[][] = new Array(selected.length);
    let next = 0;

    async function worker() {
        while (true) {
            const index = next++;
            if (index >= selected.length) return;
            try {
                allResults[index] = await processCity(selected[index], parsedAt);
            } catch {
                allResults[index] = [];
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const results = ([] as RawClinicRecord[]).concat(...allResults);
    console.log("KDL collected", results.length, "offers");
    return results;
}

export { loadKdlCities, getKdlCityNames } from "./kdlCities";
