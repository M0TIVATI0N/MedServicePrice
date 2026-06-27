import * as cheerio from "cheerio";
import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";
import { cityLocation } from "../geocoding";
import { INVITRO_CATEGORY_IDS, INVITRO_MAX_CITIES, limitCities } from "./config";

const BASE = "https://invitro.kz";

const dispatcher = new Agent({
    connect: { rejectUnauthorized: false },
    connections: 20,
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
    { slug: "ust-kamenogorsk", name: "Усть-Каменогорск" },
    { slug: "atyrau", name: "Атырау" },
    { slug: "kostanay", name: "Костанай" },
    { slug: "kyzylorda", name: "Кызылорда" },
    { slug: "petropavlovsk", name: "Петропавловск" },
    { slug: "taraz", name: "Тараз" },
    { slug: "aktau", name: "Актау" },
    { slug: "uralsk", name: "Уральск" },
    { slug: "semey", name: "Семей" },
    { slug: "kokshetau", name: "Кокшетау" },
    { slug: "taldykorgan", name: "Талдыкорган" },
    { slug: "turkestan", name: "Туркестан" }
];

function parsePrice(text: string): number {
    const match = text.match(/([\d\s]+)/);
    if (!match) return 0;
    return Number(match[1].replace(/\s/g, ""));
}

function parseDurationDays($el: cheerio.Cheerio<any>): number {
    let days = 1;
    $el.find(".analyzes-item__add--list-item span").each((_, span) => {
        const t = cheerio.load(span).text();
        const m = t.match(/(\d+)\s*(?:календарн|рабоч)/i);
        if (m) days = Math.max(days, Number(m[1]));
    });
    return days;
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
    const clinicId = `invitro-${city.slug}`;
    const cityPageUrl = `${BASE}/analizes/for-doctors/${city.slug}/`;
    $(".analyzes-item").each((_, el) => {
        const $el = $(el);
        const code = $el.find(".analyzes-item__head--number span").first().text().trim();
        const name = $el.find(".analyzes-item__title a").first().text().trim();
        const priceText = $el.find(".analyzes-item__total--sum").first().text().trim();
        const price = parsePrice(priceText);

        if (!name || price <= 0) return;

        const serviceName = code ? `${code} ${name}` : name;
        const key = `${serviceName}|${price}`;
        if (seen.has(key)) return;
        seen.add(key);

        out.push({
            clinic_id: clinicId,
            clinic_name: "ИНВИТРО",
            city: city.name,
            address: `Медицинские офисы ИНВИТРО, ${city.name}`,
            phone: "1414",
            working_hours: "Пн–Вс 07:00–20:00",
            source_url: cityPageUrl,            service_name_raw: serviceName,
            category: "лаборатория",
            price_kzt: price,
            currency: "KZT",
            duration_days: parseDurationDays($el),
            parsed_at: parsedAt,
            is_active: true,
            location: cityLocation(city.name, clinicId),
            online_booking: true,
            rating: 4.5
        });
    });

    return out;
}

async function fetchCategory(
    city: { slug: string; name: string },
    categoryId: string,
    parsedAt: Date,
    seen: Set<string>
): Promise<RawClinicRecord[]> {
    const sourceUrl =
        `${BASE}/analizes/for-doctors/${city.slug}/${categoryId}/`;

    const res = await fetch(sourceUrl, { dispatcher, headers: HEADERS });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${city.slug}/${categoryId}`);
    }

    const html = await res.text();
    return parseHtml(html, city, sourceUrl, parsedAt, seen);
}

export async function parseInvitroPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date();
    const cities = limitCities(CITIES, INVITRO_MAX_CITIES);    const seen = new Set<string>();

    const tasks = cities.flatMap(city =>
        INVITRO_CATEGORY_IDS.map(catId => ({
            city,
            catId
        }))
    );

    console.log(
        "INVITRO:",
        cities.length,
        "cities ×",
        INVITRO_CATEGORY_IDS.length,
        "categories (parallel)"
    );

    const chunks = await Promise.all(
        tasks.map(async ({ city, catId }) => {
            try {
                return await fetchCategory(city, catId, parsedAt, seen);
            } catch (err: any) {
                console.warn(`INVITRO skip ${city.slug}/${catId}:`, err?.message);
                return [];
            }
        })
    );

    const all = chunks.flat();
    console.log("INVITRO total:", all.length);
    return all;
}

