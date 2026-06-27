import * as cheerio from "cheerio";
import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";
import { cityLocation } from "../geocoding";
import { limitCities } from "./config";

const BASE = "https://gemotest.kz";

const dispatcher = new Agent({
    connections: 15,
    pipelining: 1,
    keepAliveTimeout: 30000,
    bodyTimeout: 30000,
    headersTimeout: 15000
});

const HEADERS = {
    Accept: "text/html",
    "User-Agent": "Mozilla/5.0 (compatible; MedServicePriceBot/1.0)"
};

const CITIES: Array<{ slug: string; name: string }> = [
    { slug: "almaty", name: "Алматы" },
    { slug: "astana", name: "Астана" },
    { slug: "shymkent", name: "Шымкент" },
    { slug: "karaganda", name: "Караганда" },
    { slug: "aktobe", name: "Актобе" },
    { slug: "pavlodar", name: "Павлодар" },
    { slug: "atyrau", name: "Атырау" },
    { slug: "aktau", name: "Актау" },
    { slug: "uralsk", name: "Уральск" },
    { slug: "semey", name: "Семей" },
    { slug: "kostanay", name: "Костанай" },
    { slug: "kyzylorda", name: "Кызылорда" },
    { slug: "petropavlovsk", name: "Петропавловск" },
    { slug: "taraz", name: "Тараз" },
    { slug: "ust-kamenogorsk", name: "Усть-Каменогорск" }
];

/** Cities known to host a local Gemotest catalog on gemotest.kz */
const CATALOG_SOURCE_SLUGS = ["almaty", "astana", "taraz", "shymkent"];

const MAX_SUBPAGES = Number(process.env.GEMOTEST_MAX_SUBPAGES ?? 50);

function parsePrice(text: string): number {
    const m = text.replace(/\s/g, "").match(/(\d+)/);
    return m ? Number(m[1]) : 0;
}

async function fetchHtml(path: string): Promise<string | null> {
    try {
        const res = await fetch(`${BASE}${path}`, { dispatcher, headers: HEADERS });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

function extractItemsFromHtml(html: string): Array<{ name: string; price: number; path?: string }> {
    const $ = cheerio.load(html);
    const items: Array<{ name: string; price: number; path?: string }> = [];
    const seen = new Set<string>();

    $("a[href*='/catalog/']").each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href") ?? "";
        if (!href.includes("/catalog/")) return;

        const block = $a.closest("[class*='card'], [class*='product'], [class*='item'], li, article").first();
        const container = block.length ? block : $a.parent().parent();
        const text = container.text().replace(/\s+/g, " ").trim();
        const priceMatch = text.match(/(\d[\d\s]{2,})\s*₸/);
        if (!priceMatch) return;

        const price = parsePrice(priceMatch[1]);
        if (price < 200 || price > 500_000) return;

        let name = $a.text().replace(/\s+/g, " ").trim();
        name = name
            .replace(/за срочный.*$/i, "")
            .replace(/В корзину.*$/i, "")
            .replace(/\d[\d\s]+\s*₸.*$/i, "")
            .trim();

        if (name.length < 4) {
            name = text.replace(priceMatch[0], "").trim();
        }
        if (name.length < 4) return;

        const key = `${name}|${price}`;
        if (seen.has(key)) return;
        seen.add(key);

        items.push({
            name,
            price,
            path: href.split("?")[0]
        });
    });

    return items;
}

async function loadCityCatalogItems(citySlug: string): Promise<Array<{ name: string; price: number }>> {
    const catalogPath = `/${citySlug}/catalog/`;
    const mainHtml = await fetchHtml(catalogPath);
    if (!mainHtml) return [];

    const seen = new Set<string>();
    const items: Array<{ name: string; price: number }> = [];

    const addItems = (batch: Array<{ name: string; price: number; path?: string }>) => {
        for (const item of batch) {
            const key = `${item.name}|${item.price}`;
            if (seen.has(key)) continue;
            seen.add(key);
            items.push({ name: item.name, price: item.price });
        }
    };

    const firstBatch = extractItemsFromHtml(mainHtml);
    addItems(firstBatch);

    const subPaths = new Set<string>();
    for (const item of firstBatch) {
        if (item.path && item.path.includes("/catalog/") && !item.path.endsWith("/catalog/")) {
            subPaths.add(item.path);
        }
    }

    const $ = cheerio.load(mainHtml);
    $(`a[href*='/${citySlug}/catalog/']`).each((_, a) => {
        const href = $(a).attr("href") ?? "";
        if (href.includes("/catalog/") && href.split("/catalog/")[1]?.length > 1) {
            subPaths.add(href.split("?")[0]);
        }
    });

    for (const path of [...subPaths].slice(0, MAX_SUBPAGES)) {
        const html = await fetchHtml(path);
        if (html) addItems(extractItemsFromHtml(html));
    }

    return items;
}

async function loadNationalCatalog(): Promise<Array<{ name: string; price: number }>> {
    const merged = new Map<string, { name: string; price: number }>();

    for (const slug of CATALOG_SOURCE_SLUGS) {
        const items = await loadCityCatalogItems(slug);
        console.log(`GEMOTEST catalog source ${slug}: ${items.length} services`);
        for (const item of items) {
            const key = `${item.name}|${item.price}`;
            if (!merged.has(key)) merged.set(key, item);
        }
    }

    return [...merged.values()];
}

function itemsToRecords(
    items: Array<{ name: string; price: number }>,
    city: { slug: string; name: string },
    sourceUrl: string,
    parsedAt: Date
): RawClinicRecord[] {
    const clinicId = `gemotest-${city.slug}`;
    return items.map(item => ({
        clinic_id: clinicId,
        clinic_name: "Гемотест",
        city: city.name,
        address: `Гемотест, ${city.name}`,
        phone: "1415",
        working_hours: "",
        source_url: sourceUrl,
        service_name_raw: item.name,
        category: "лаборатория",
        price_kzt: item.price,
        currency: "KZT",
        duration_days: 1,
        parsed_at: parsedAt,
        is_active: true,
        location: cityLocation(city.name, clinicId),
        online_booking: true,
        rating: 4.4
    }));
}

export async function parseGemotestPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date();
    const items = await loadNationalCatalog();

    if (!items.length) {
        console.warn("GEMOTEST: no items parsed");
        return [];
    }

    const max = Number(process.env.GEMOTEST_MAX_CITIES ?? 0);
    const cities = limitCities(CITIES, max || CITIES.length);
    const sourceUrl = `${BASE}/almaty/catalog/`;
    const out = cities.flatMap(city => itemsToRecords(items, city, sourceUrl, parsedAt));

    console.log(
        "GEMOTEST total:",
        out.length,
        `(${items.length} services × ${cities.length} cities)`
    );
    return out;
}
