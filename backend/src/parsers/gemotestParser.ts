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
    { slug: "semey", name: "Семей" }
];

function parsePrice(text: string): number {
    const m = text.replace(/\s/g, "").match(/(\d+)/);
    return m ? Number(m[1]) : 0;
}

function extractFromHtml(
    html: string,
    city: { slug: string; name: string },
    sourceUrl: string,
    parsedAt: Date,
    seen: Set<string>
): RawClinicRecord[] {
    const out: RawClinicRecord[] = [];
    const clinicId = `gemotest-${city.slug}`;
    const $ = cheerio.load(html);

    $("[data-price], .price, [class*='Price']").each((_, el) => {
        const $el = $(el);
        const priceText = $el.text().trim();
        const price = parsePrice(priceText);
        if (price <= 0) return;

        const name =
            $el.closest("[class*='catalog'], [class*='product'], li, tr")
                .find("a, h2, h3, .title")
                .first()
                .text()
                .trim()
            || $el.parent().text().replace(priceText, "").trim();

        if (name.length < 4) return;

        const key = `${name}|${price}`;
        if (seen.has(key)) return;
        seen.add(key);

        out.push({
            clinic_id: clinicId,
            clinic_name: "Гемотест",
            city: city.name,
            address: `Гемотест, ${city.name}`,
            phone: "1415",
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
            rating: 4.4
        });
    });

    return out;
}

async function fetchCityCatalog(
    city: { slug: string; name: string },
    parsedAt: Date,
    seen: Set<string>
): Promise<RawClinicRecord[]> {
    const sourceUrl = `${BASE}/${city.slug}/catalog/`;
    try {
        const res = await fetch(sourceUrl, { dispatcher, headers: HEADERS });
        if (!res.ok) return [];
        const html = await res.text();
        return extractFromHtml(html, city, sourceUrl, parsedAt, seen);
    } catch {
        return [];
    }
}

export async function parseGemotestPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date();
    const max = Number(process.env.GEMOTEST_MAX_CITIES ?? 0);
    const cities = limitCities(CITIES, max || CITIES.length);
    const seen = new Set<string>();

    const chunks = await Promise.all(
        cities.map(city => fetchCityCatalog(city, parsedAt, seen))
    );

    const all = chunks.flat();
    console.log("GEMOTEST total:", all.length);
    return all;
}
