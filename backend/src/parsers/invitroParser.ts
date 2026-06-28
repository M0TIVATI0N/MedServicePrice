import * as cheerio from "cheerio";
import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";
import { cityLocation } from "../geocoding";
import { INVITRO_MAX_CITIES, limitCities } from "./config";
import { loadInvitroOffices } from "./invitroOffices";

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

const MAX_CATEGORIES_PER_CITY = Number(process.env.INVITRO_MAX_CATEGORIES ?? 35);

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

async function discoverCategoryIds(citySlug: string): Promise<string[]> {
    const url = `${BASE}/analizes/for-doctors/${citySlug}/`;
    const res = await fetch(url, { dispatcher, headers: HEADERS });
    if (!res.ok) return ["156", "157", "171", "140"];

    const html = await res.text();
    const $ = cheerio.load(html);
    const ids = new Set<string>();

    $(`a[href*='/analizes/for-doctors/${citySlug}/']`).each((_, a) => {
        const m = ($(a).attr("href") ?? "").match(/\/(\d+)\/?$/);
        if (m) ids.add(m[1]);
    });

    const list = [...ids];
    return list.length ? list.slice(0, MAX_CATEGORIES_PER_CITY) : ["156", "157", "171", "140"];
}

function parseHtml(
    html: string,
    city: { slug: string; name: string },
    sourceUrl: string,
    parsedAt: Date,
    seen: Set<string>
): Array<Omit<RawClinicRecord, "clinic_id" | "clinic_name" | "address" | "location" | "source_url">> {
    const $ = cheerio.load(html);
    const services: Array<Omit<RawClinicRecord, "clinic_id" | "clinic_name" | "address" | "location" | "source_url">> = [];

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

        services.push({
            city: city.name,
            phone: "1414",
            working_hours: "Пн–Вс 07:00–20:00",
            service_name_raw: serviceName,
            category: "лаборатория",
            price_kzt: price,
            currency: "KZT",
            duration_days: parseDurationDays($el),
            parsed_at: parsedAt,
            is_active: true,
            online_booking: true,
            rating: 4.5
        });
    });

    return services;
}

async function fetchCategory(
    city: { slug: string; name: string },
    categoryId: string,
    parsedAt: Date,
    seen: Set<string>
) {
    const sourceUrl = `${BASE}/analizes/for-doctors/${city.slug}/${categoryId}/`;
    const res = await fetch(sourceUrl, { dispatcher, headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    return parseHtml(html, city, sourceUrl, parsedAt, seen);
}

export async function parseInvitroPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date();
    const cities = limitCities(CITIES, INVITRO_MAX_CITIES);
    const out: RawClinicRecord[] = [];

    for (const city of cities) {
        const seen = new Set<string>();
        const [offices, categoryIds] = await Promise.all([
            loadInvitroOffices(city.slug),
            discoverCategoryIds(city.slug)
        ]);

        const clinicTargets = offices.length
            ? offices.map(o => ({
                clinic_id: `invitro-${city.slug}-${o.id}`,
                clinic_name: o.name,
                address: o.address,
                location: o.location ?? cityLocation(city.name, `invitro-${city.slug}-${o.id}`),
                source_url: `${BASE}/offices/${city.slug}/#office-${o.id}`,
            }))
            : [{
                clinic_id: `invitro-${city.slug}`,
                clinic_name: "ИНВИТРО",
                address: `Медицинские офисы ИНВИТРО, ${city.name}`,
                location: cityLocation(city.name, `invitro-${city.slug}`),
                source_url: `${BASE}/analizes/for-doctors/${city.slug}/`
            }];

        const serviceRows = (
            await Promise.all(
                categoryIds.map(async catId => {
                    try {
                        return await fetchCategory(city, catId, parsedAt, seen);
                    } catch (err: any) {
                        console.warn(`INVITRO skip ${city.slug}/${catId}:`, err?.message);
                        return [];
                    }
                })
            )
        ).flat();

        for (const clinic of clinicTargets) {
            for (const svc of serviceRows) {
                out.push({
                    ...svc,
                    clinic_id: clinic.clinic_id,
                    clinic_name: clinic.clinic_name,
                    address: clinic.address,
                    location: clinic.location,
                    source_url: clinic.source_url
                });
            }
        }

        console.log(
            `INVITRO ${city.name}: ${clinicTargets.length} offices × ${serviceRows.length} services`
        );
    }

    console.log("INVITRO total:", out.length);
    return out;
}
