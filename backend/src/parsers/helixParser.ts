import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";
import { cityLocation } from "../geocoding";

const HELIX_WEB = "https://helix.ru";
const HELIX_API = "https://helixru-webapi-prod.medindex.ru/api";

const dispatcher = new Agent({
    connect: { rejectUnauthorized: false, timeout: 30_000 },
    connections: 10,
    keepAliveTimeout: 30000,
    bodyTimeout: 45000,
    headersTimeout: 20000
});

const HEADERS = {
    Accept: "text/html,application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "ru-RU,ru;q=0.9"
};

/** Helix.ru city alias → display name (KZ cities with Helix pages) */
const HELIX_CITY_PAGES: Array<{ alias: string; name: string; cityId?: number }> = [
    { alias: "almaty", name: "Алматы", cityId: 238 },
    { alias: "astana", name: "Астана", cityId: 391 },
    { alias: "pavlodar", name: "Павлодар", cityId: 0 }
];

const HELIX_CITY_SLUGS: Record<string, string> = {
    Алматы: "almaty",
    Астана: "astana",
    Павлодар: "pavlodar",
    Шымкент: "almaty",
    Караганда: "almaty",
    Актобе: "almaty",
    "Усть-Каменогорск": "almaty",
    Атырау: "almaty",
    Костанай: "almaty",
    Кызылорда: "almaty",
    Петропавловск: "almaty",
    Тараз: "almaty",
    Актау: "almaty",
    Уральск: "almaty",
    Семей: "almaty"
};

function helixCityUrl(cityName: string): string {
    const slug = HELIX_CITY_SLUGS[cityName] ?? "almaty";
    return `${HELIX_WEB}/${slug}`;
}

interface HelixProduct {
    hxid: string;
    title: string;
    price: number;
}

function decodeTitle(raw: string): string {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );
}

function extractProductsFromHtml(html: string): HelixProduct[] {
    const products: HelixProduct[] = [];
    const seen = new Set<string>();
    const re =
        /\{"hxid":"([^"]+)"[\s\S]{0,900}?"title":"((?:\\.|[^"\\])*)"[\s\S]{0,250}?"price":\{"value":(\d+)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        const key = m[1];
        if (seen.has(key)) continue;
        seen.add(key);
        products.push({
            hxid: m[1],
            title: decodeTitle(m[2]),
            price: Number(m[3])
        });
    }

    return products;
}

async function fetchHelixApiProducts(cityId: number): Promise<HelixProduct[]> {
    const urls = [
        `${HELIX_API}/catalog/popular-items/${cityId}`,
        `${HELIX_API}/service-collections/${cityId}`
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, { dispatcher, headers: HEADERS });
            if (!res.ok) continue;

            const json: any = await res.json();
            const items: any[] = json?.items ?? json?.data ?? json?.result ?? [];
            const products = items
                .map(item => ({
                    hxid: String(item.hxid ?? item.id ?? ""),
                    title: String(item.title ?? item.name ?? ""),
                    price: Number(item.price?.value ?? item.price ?? 0)
                }))
                .filter(p => p.hxid && p.title && p.price > 0);

            if (products.length) return products;
        } catch {
            continue;
        }
    }

    return [];
}

async function loadProductsForAlias(alias: string, cityId?: number): Promise<HelixProduct[]> {
    const merged = new Map<string, HelixProduct>();
    const paths = [`/${alias}`, `/${alias}/catalog`];

    for (const path of paths) {
        try {
            const res = await fetch(`${HELIX_WEB}${path}`, {
                dispatcher,
                headers: HEADERS,
                redirect: "follow"
            });
            if (!res.ok) continue;

            const html = await res.text();
            for (const p of extractProductsFromHtml(html)) {
                if (!merged.has(p.hxid)) merged.set(p.hxid, p);
            }
        } catch {
            /* try next path */
        }
    }

    if (merged.size) return [...merged.values()];

    if (cityId) {
        return fetchHelixApiProducts(cityId);
    }

    return [];
}

function productsToRecords(
    products: HelixProduct[],
    cityName: string,
    citySlug: string,
    sourceUrl: string,
    parsedAt: Date
): RawClinicRecord[] {
    const clinicId = `helix-${citySlug.replace(/\s+/g, "-").toLowerCase()}`;

    return products.map(p => ({
        clinic_id: clinicId,
        clinic_name: "Helix",
        city: cityName,
        address: `Лаборатория Helix, ${cityName}`,
        phone: "",
        working_hours: "",
        source_url: helixCityUrl(cityName),
        service_name_raw: p.title,
        category: "лаборатория",
        price_kzt: p.price,
        currency: "KZT",
        duration_days: 1,
        parsed_at: parsedAt,
        is_active: true,
        location: cityLocation(cityName, clinicId),
        online_booking: true,
        rating: 4.3
    }));
}

export async function parseHelixPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date();
    const productMap = new Map<string, HelixProduct>();

    for (const page of HELIX_CITY_PAGES) {
        const products = await loadProductsForAlias(page.alias, page.cityId);
        console.log(`HELIX ${page.alias}: ${products.length} products`);
        for (const p of products) {
            if (!productMap.has(p.hxid)) productMap.set(p.hxid, p);
        }
    }

    try {
        const res = await fetch(`${HELIX_WEB}/catalog`, {
            dispatcher,
            headers: HEADERS,
            redirect: "follow"
        });
        if (res.ok) {
            const html = await res.text();
            for (const p of extractProductsFromHtml(html)) {
                if (!productMap.has(p.hxid)) productMap.set(p.hxid, p);
            }
            console.log(`HELIX /catalog: ${productMap.size} unique products total`);
        }
    } catch {
        /* optional */
    }

    const baseProducts = [...productMap.values()];
    if (!baseProducts.length) {
        console.warn("HELIX: no products parsed");
        return [];
    }

    const out: RawClinicRecord[] = [];

    for (const page of HELIX_CITY_PAGES) {
        out.push(
            ...productsToRecords(
                baseProducts,
                page.name,
                page.alias,
                helixCityUrl(page.name),
                parsedAt
            )
        );
    }

    for (const cityName of Object.keys(HELIX_CITY_SLUGS)) {
        if (HELIX_CITY_PAGES.some(p => p.name === cityName)) continue;
        out.push(
            ...productsToRecords(
                baseProducts,
                cityName,
                HELIX_CITY_SLUGS[cityName],
                helixCityUrl(cityName),
                parsedAt
            )
        );
    }

    console.log("HELIX total:", out.length);
    return out;
}
