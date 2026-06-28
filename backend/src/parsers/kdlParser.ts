import { Agent, fetch } from "undici";
import { RawClinicRecord } from "../models";
import { cityLocation } from "../geocoding";
import { KDL_MAX_CITIES, limitCities } from "./config";
import { kdlPricelistUrl, loadKdlCities, KdlCity } from "./kdlCities";

const ANALYSIS_URL = "https://www.kdlolymp.kz/api/analysis-data";
const CABINET_URL = "https://www.kdlolymp.kz/api/procedure-cabinet";
const KDL_PHONE = "+77020528585";

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

interface CabinetSchedule {
    type: string;
    weekday_start: string | null;
    weekday_end: string | null;
    saturday_start: string | null;
    saturday_end: string | null;
    sunday_start: string | null;
    sunday_end: string | null;
}

interface CabinetTranslation {
    title: string;
    address: string;
    address_note: string;
}

interface Cabinet {
    id: number;
    city_id: number;
    slug?: string;
    is_active?: number;

    latitude: string;
    longitude: string;

    phone: string | null;
    email: string | null;

    is_works_on_weekends: number;
    is_works_on_holidays: number;
    is_cashless_payment: number;
    is_kaspired: number;
    is_ramp: number;

    translation: CabinetTranslation;

    schedules: CabinetSchedule[];
}

const cabinetCacheByCity = new Map<number, Cabinet[]>();

async function loadCityCabinets(city: KdlCity): Promise<Cabinet[]> {
    const cached = cabinetCacheByCity.get(city.id);
    if (cached) return cached;

    try {
        const res = await fetch(
            `${CABINET_URL}?lang=ru-RU&city_id=${city.id}`,
            {
                dispatcher,
                headers: {
                    ...BASE_HEADERS,
                    Referer: `https://www.kdlolymp.kz/cabinets/${city.slug}`,
                    Cookie: `accepted-city=${city.id}; currentCity=${city.id}`
                }
            }
        );

        if (!res.ok) {
            cabinetCacheByCity.set(city.id, []);
            return [];
        }

        const json: any = await res.json();
        const cabinets: Cabinet[] = (Array.isArray(json.data) ? json.data : [])
            .filter((c: Cabinet) => c.is_active !== 0);

        cabinetCacheByCity.set(city.id, cabinets);
        return cabinets;
    } catch {
        cabinetCacheByCity.set(city.id, []);
        return [];
    }
}

function makeWorkingHours(cabinet: Cabinet): string {
    const schedule = cabinet.schedules.find(
        s => s.type === "working_hours"
    );

    if (!schedule)
        return "По расписанию";

    const parts: string[] = [];

    if (schedule.weekday_start && schedule.weekday_end) {
        parts.push(
            `Пн-Пт ${schedule.weekday_start}-${schedule.weekday_end}`
        );
    }

    if (schedule.saturday_start && schedule.saturday_end) {
        parts.push(
            `Сб ${schedule.saturday_start}-${schedule.saturday_end}`
        );
    }

    if (schedule.sunday_start && schedule.sunday_end) {
        parts.push(
            `Вс ${schedule.sunday_start}-${schedule.sunday_end}`
        );
    }

    return parts.join(", ");
}
function kdlCabinetUrl(city: KdlCity, cabinet: Cabinet): string {
    return `https://www.kdlolymp.kz/cabinets/${city.slug}`;
}

async function fetchPage(
    city: KdlCity,
    page: number
): Promise<any[] | null> {

    const url =
        ANALYSIS_URL +
        "?lang=ru-RU" +
        "&city_id=" + city.id +
        "&city_slug=" + city.slug +
        "&search=" +
        "&per-page=500" +
        "&page=" + page;

    try {

        const res = await fetch(url, {
            dispatcher,
            headers: {
                ...BASE_HEADERS,
                Referer: kdlPricelistUrl(city.slug),
                Cookie:
                    "accepted-city=" +
                    city.id +
                    "; currentCity=" +
                    city.id
            }
        });

        if (!res.ok)
            return null;

        const json: any = await res.json();

        return Array.isArray(json.data)
            ? json.data
            : null;

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
    out: RawClinicRecord[],
    cabinet: Cabinet
) {

    const clinicId = `kdl-${city.slug}-${cabinet.id}`;

    const lat = Number(cabinet.latitude);
    const lng = Number(cabinet.longitude);

    const location =
        Number.isFinite(lat) && Number.isFinite(lng)
            ? { lat, lng }
            : cityLocation(city.title, clinicId);

    const workingHours = makeWorkingHours(cabinet);

    for (const category of categories) {

        if (!Array.isArray(category.analysis))
            continue;

        for (const item of category.analysis) {

            const priceObj = item.price;

            if (!priceObj || priceObj.price == null)
                continue;

            const title =
                item.translation?.title ??
                item.name ??
                item.slug ??
                "";

            const key =
                clinicId +
                "|" +
                title +
                "|" +
                priceObj.price;

            if (seen.has(key))
                continue;

            seen.add(key);

            out.push({
                clinic_id: clinicId,

                clinic_name: cabinet.translation.title
                    ? `KDL — ${cabinet.translation.title.trim()}`
                    : `KDL ОЛИМП — ${city.title}`,

                city: city.title,

                address: cabinet.translation.address
                    ? `${cabinet.translation.address}, ${city.title}`
                    : `Лаборатория KDL, ${city.title}`,

                phone: cabinet.phone ?? KDL_PHONE,

                working_hours: workingHours,

                source_url: kdlCabinetUrl(city, cabinet),

                service_name_raw:
                    title,

                category:
                    "лаборатория",

                price_kzt:
                    Number(priceObj.price),

                currency:
                    "KZT",

                duration_days:
                    Number(priceObj.min_duration ?? 1),

                parsed_at:
                    parsedAt,

                is_active:
                    true,

                location,

                online_booking:
                    true,

                rating:
                    4.4,

                email:
                    cabinet.email ?? "",

                metadata: {
                    provider: "KDL",
                    weekend: Boolean(cabinet.is_works_on_weekends),
                    holidays: Boolean(cabinet.is_works_on_holidays)
                }
            } as RawClinicRecord);
        }
    }
}

async function processCity(
    city: KdlCity,
    parsedAt: Date
): Promise<RawClinicRecord[]> {

    const out: RawClinicRecord[] = [];

    const pricelistUrl =
        kdlPricelistUrl(city.slug);

    const cabinets = await loadCityCabinets(city);

    const page1 =
        await fetchPage(city, 1);

    if (!page1)
        return out;

    const needsSecondPage =
        page1.some(category =>
            Array.isArray(category.analysis) &&
            category.analysis.length === 500
        );

    const page2 = needsSecondPage
        ? await fetchPage(city, 2)
        : null;

    if (!cabinets.length) {

        const fakeCabinet: Cabinet = {
            id: city.id,
            city_id: city.id,
            latitude: "",
            longitude: "",
            phone: "",
            email: "",
            is_works_on_weekends: 0,
            is_works_on_holidays: 0,
            is_cashless_payment: 0,
            is_kaspired: 0,
            is_ramp: 0,
            translation: {
                title: `KDL ОЛИМП — ${city.title}`,
                address: `Лаборатория KDL, ${city.title}`,
                address_note: ""
            },
            schedules: []
        };

        const seen = new Set<string>();

        extractFromCategories(
            city,
            parsedAt,
            pricelistUrl,
            page1,
            seen,
            out,
            fakeCabinet
        );

        if (page2) {
            extractFromCategories(
                city,
                parsedAt,
                pricelistUrl,
                page2,
                seen,
                out,
                fakeCabinet
            );
        }

        return out;
    }

    for (const cabinet of cabinets) {

        const seen = new Set<string>();

        extractFromCategories(
            city,
            parsedAt,
            pricelistUrl,
            page1,
            seen,
            out,
            cabinet
        );

        if (page2) {
            extractFromCategories(
                city,
                parsedAt,
                pricelistUrl,
                page2,
                seen,
                out,
                cabinet
            );
        }
    }

    return out;
}
export async function parseKdlPrices(): Promise<RawClinicRecord[]> {

    const cities = await loadKdlCities();

    console.log(
        "KDL cities available:",
        cities.length
    );

    const selected =
        limitCities(
            cities,
            KDL_MAX_CITIES
        );

    console.log(
        "KDL parsing",
        selected.length,
        "cities"
    );

    const parsedAt =
        new Date();

    const allResults:
        RawClinicRecord[][] =
        new Array(
            selected.length
        );

    let next = 0;

    async function worker() {

        while (true) {

            const index =
                next++;

            if (
                index >=
                selected.length
            ) {
                return;
            }

            const city =
                selected[index];

            try {
                const cityRecords = await processCity(city, parsedAt);
                allResults[index] = cityRecords;
                if (cityRecords.length) {
                    const clinics = new Set(cityRecords.map(r => r.clinic_id)).size;
                    console.log(`[KDL] ${city.title}: ${clinics} offices, ${cityRecords.length} offers`);
                }

            } catch (error) {

                console.error(
                    "[KDL ERROR]",
                    city.title,
                    error
                );

                allResults[index] =
                    [];
            }
        }
    }

    await Promise.all(
        Array.from(
            {
                length:
                    CONCURRENCY
            },
            worker
        )
    );

    const results =
        ([] as RawClinicRecord[])
            .concat(
                ...allResults
            );

    console.log(
        "KDL collected",
        results.length,
        "offers"
    );

    return results;
}

export {
    loadKdlCities
} from "./kdlCities";

export {
    getKdlCityNames
} from "./kdlCities";