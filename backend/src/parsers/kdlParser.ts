import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";

interface City {
    id: number;
    slug: string;
    title: string;
}

const BASE_URL =
    "https://www.kdlolymp.kz/api/analysis-data";

const CONCURRENCY = 40;

const dispatcher = new Agent({
    connections: 120,
    pipelining: 8,
    keepAliveTimeout: 120000,
    keepAliveMaxTimeout: 120000
});

const BASE_HEADERS = Object.freeze({
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0"
});

async function fetchPage(
    city: City,
    page: number,
    headers: Record<string, string>
): Promise<{ url: string; json: any } | null> {
    const url =
        BASE_URL +
        "?lang=ru-RU&city_id=" +
        city.id +
        "&city_slug=" +
        city.slug +
        "&search=&per-page=100&page=" +
        page;

    try {
        const res = await fetch(url, {
            dispatcher,
            headers
        });

        if (!res.ok) return null;

        return {
            url,
            json: await res.json()
        };
    } catch {
        return null;
    }
}

function extractInto(
    city: City,
    parsedAt: Date,
    url: string,
    categories: any[],
    out: RawClinicRecord[],
    seen?: Set<string>
) {
    const clinicId = "kdl-" + city.slug;
    const cityTitle = city.title;

    for (let i = 0; i < categories.length; i++) {
        const analysis = categories[i].analysis;

        if (!Array.isArray(analysis)) continue;

        for (let j = 0; j < analysis.length; j++) {
            const item = analysis[j];

            const priceObj = item.price;

            if (!priceObj) continue;

            const price = priceObj.price;

            if (price == null) continue;

            const title =
                item.translation?.title ||
                item.name ||
                item.slug ||
                "";

            if (seen) {
                const key = title + "|" + price;

                if (seen.has(key)) continue;

                seen.add(key);
            }

            out.push({
                clinic_id: clinicId,
                clinic_name: "KDL",
                city: cityTitle,
                address: "",
                phone: "",
                working_hours: "",
                source_url: url,
                service_name_raw: title,
                category: "лаборатория",
                price_kzt: price,
                currency: "KZT",
                duration_days: priceObj.min_duration ?? 1,
                parsed_at: parsedAt,
                is_active: true
            });
        }
    }
}

async function processCity(
    city: City,
    parsedAt: Date,
    results: RawClinicRecord[]
) {
    const headers = {
        ...BASE_HEADERS,
        Referer:
            "https://www.kdlolymp.kz/pricelist/" +
            city.slug,
        Cookie:
            "accepted-city=" +
            city.id +
            "; currentCity=" +
            city.id
    };

    const first = await fetchPage(city, 1, headers);

    if (!first) return;

    const categories = first.json.data;

    if (!Array.isArray(categories)) return;

    const before = results.length;

    extractInto(
        city,
        parsedAt,
        first.url,
        categories,
        results
    );

    let secondNeeded = false;

    for (let i = 0; i < categories.length; i++) {
        const analysis = categories[i].analysis;

        if (
            Array.isArray(analysis) &&
            analysis.length === 100
        ) {
            secondNeeded = true;
            break;
        }
    }

    if (!secondNeeded) return;

    const second = await fetchPage(city, 2, headers);

    if (!second) return;

    const secondCategories = second.json.data;

    if (!Array.isArray(secondCategories)) return;

    const seen = new Set<string>();

    for (let i = before; i < results.length; i++) {
        const r = results[i];
        seen.add(r.service_name_raw + "|" + r.price_kzt);
    }

    extractInto(
        city,
        parsedAt,
        second.url,
        secondCategories,
        results,
        seen
    );
}

export async function parseKdlPrices(): Promise<RawClinicRecord[]> {
    const res = await fetch(
        "https://www.kdlolymp.kz/api/area?cities=true&lang=ru-RU",
        {
            dispatcher,
            headers: BASE_HEADERS
        }
    );

    if (!res.ok) {
        throw new Error("Cannot load cities");
    }

    const json: any = await res.json();

    const cities: City[] = [];

    const areas = json.data ?? [];

    for (let i = 0; i < areas.length; i++) {
        const areaCities = areas[i].cities;

        if (!Array.isArray(areaCities)) continue;

        for (let j = 0; j < areaCities.length; j++) {
            const city = areaCities[j];

            if (!city.is_active) continue;

            cities.push({
                id: city.id,
                slug: city.slug,
                title:
                    city.translation?.title ??
                    city.slug
            });
        }
    }

    console.log("Loaded", cities.length, "cities");

    const parsedAt = new Date();

    const results: RawClinicRecord[] = [];

    let next = 0;

    async function worker() {
        while (true) {
            const index = next++;

            if (index >= cities.length) return;

            try {
                await processCity(
                    cities[index],
                    parsedAt,
                    results
                );
            } catch {}
        }
    }

    const workers = new Array(CONCURRENCY);

    for (let i = 0; i < CONCURRENCY; i++) {
        workers[i] = worker();
    }

    await Promise.all(workers);

    console.log("Collected", results.length, "offers");

    return results;
}