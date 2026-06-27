import * as cheerio from "cheerio";
import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";
import { cityLocation } from "../geocoding";
import { limitCities } from "./config";

const BASE = "https://helix.kz";

const dispatcher = new Agent({
    connect: { rejectUnauthorized: false },
    connections: 10,
    pipelining: 1,
    keepAliveTimeout: 30000,
    bodyTimeout: 30000,
    headersTimeout: 15000
});

const HEADERS = {
    Accept: "text/html",
    "User-Agent": "Mozilla/5.0 (compatible; MedServicePriceBot/1.0)"
};

/** Helix city pages (public price lists) */
const CITIES: Array<{ slug: string; name: string }> = [
    { slug: "almaty", name: "Алматы" },
    { slug: "astana", name: "Астана" },
    { slug: "shymkent", name: "Шымкент" },
    { slug: "karaganda", name: "Караганда" },
    { slug: "aktobe", name: "Актобе" },
    { slug: "pavlodar", name: "Павлодар" },
    { slug: "atyrau", name: "Атырау" },
    { slug: "ust-kamenogorsk", name: "Усть-Каменогорск" },
    { slug: "aktau", name: "Актау" },
    { slug: "uralsk", name: "Уральск" },
    { slug: "semey", name: "Семей" }
];

function parsePrice(text: string): number {
    const match = text.replace(/\s/g, "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
}

function parseHtml(
    html: string,
    city: { slug: string; name: string },
    sourceUrl: string,
    parsedAt: Date,
    seen: Set<string>
): RawClinicRecord[] {
    const $ = cheerio.load(html);
    const out: RawClinicRecord[] = [];
    const clinicId = `helix-${city.slug}`;

    $("tr, .catalog-item, .analysis-item, [class*='price-item']").each((_, el) => {
        const $el = $(el);
        const text = $el.text().replace(/\s+/g, " ").trim();
        if (text.length < 5 || text.length > 300) return;

        const priceMatch = text.match(/(\d[\d\s]{2,})\s*(?:₸|тг|KZT)/i)
            ?? text.match(/(\d[\d\s]{2,})\s*$/);
        if (!priceMatch) return;

        const price = parsePrice(priceMatch[1]);
        if (price <= 0 || price > 500_000) return;

        const name = text.replace(priceMatch[0], "").replace(/\d+\s*₸.*$/i, "").trim();
        if (name.length < 4) return;

        const key = `${name}|${price}`;
        if (seen.has(key)) return;
        seen.add(key);

        out.push({
            clinic_id: clinicId,
            clinic_name: "Helix",
            city: city.name,
            address: `Лаборатория Helix, ${city.name}`,
            phone: "",
            working_hours: "",
            source_url: sourceUrl,
            service_name_raw: name,
            category: "лаборатория",
            price_kzt: price,
            currency: "KZT",
            duration_days: 1,
            parsed_at: parsedAt,
            is_active: true,
            location: cityLocation(city.name, clinicId),
            online_booking: true,
            rating: 4.3
        });
    });

    return out;
}

async function fetchCity(
    city: { slug: string; name: string },
    parsedAt: Date,
    seen: Set<string>
): Promise<RawClinicRecord[]> {
    const paths = [
        `/price/${city.slug}/`,
        `/pricelist/${city.slug}/`,
        `/analizy/${city.slug}/`,
        `/`
    ];

    for (const path of paths) {
        const sourceUrl = `${BASE}${path}`;
        try {
            const res = await fetch(sourceUrl, { dispatcher, headers: HEADERS });
            if (!res.ok) continue;
            const html = await res.text();
            const records = parseHtml(html, city, sourceUrl, parsedAt, seen);
            if (records.length > 0) return records;
        } catch {
            continue;
        }
    }

    return [];
}

export async function parseHelixPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date();
    const cities = limitCities(CITIES, Number(process.env.HELIX_MAX_CITIES ?? 0) || CITIES.length);
    const seen = new Set<string>();

    const chunks = await Promise.all(
        cities.map(city => fetchCity(city, parsedAt, seen))
    );

    const all = chunks.flat();
    console.log("HELIX total:", all.length);
    return all;
}
