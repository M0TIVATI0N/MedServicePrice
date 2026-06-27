import { Agent, fetch } from "undici";

export interface KdlCity {
    id: number;
    slug: string;
    title: string;
}

const dispatcher = new Agent({
    connections: 20,
    pipelining: 1,
    keepAliveTimeout: 30000,
    bodyTimeout: 15000,
    headersTimeout: 15000
});

const HEADERS = Object.freeze({
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0"
});

let cachedCities: KdlCity[] | null = null;
let cacheTs = 0;
const CACHE_MS = 24 * 60 * 60 * 1000;

export async function loadKdlCities(force = false): Promise<KdlCity[]> {
    if (!force && cachedCities && Date.now() - cacheTs < CACHE_MS) {
        return cachedCities;
    }

    const res = await fetch(
        "https://www.kdlolymp.kz/api/area?cities=true&lang=ru-RU",
        { dispatcher, headers: HEADERS }
    );

    if (!res.ok) throw new Error("KDL: cannot load cities");

    const json: any = await res.json();
    const cities: KdlCity[] = [];

    for (const area of json.data ?? []) {
        if (!Array.isArray(area.cities)) continue;
        for (const city of area.cities) {
            if (!city.is_active) continue;
            cities.push({
                id: city.id,
                slug: city.slug,
                title: city.translation?.title ?? city.slug
            });
        }
    }

    cities.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    cachedCities = cities;
    cacheTs = Date.now();
    return cities;
}

export async function getKdlCityNames(): Promise<string[]> {
    const cities = await loadKdlCities();
    return cities.map(c => c.title);
}

export function kdlPricelistUrl(citySlug: string): string {
    return `https://www.kdlolymp.kz/pricelist/${citySlug}`;
}
