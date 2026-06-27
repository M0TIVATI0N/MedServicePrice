import { RawClinicRecord } from "../models";

interface City {
    id: number;
    slug: string;
    title: string;
}

const CONCURRENCY = 5;
const MAX_PAGES = 30;

const BASE_URL =
    "https://www.kdlolymp.kz/api/analysis-data";

async function fetchJson(url: string, city: City): Promise<any | null> {
    try {
        const res = await fetch(url, {
            headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0",
                Referer: `https://www.kdlolymp.kz/pricelist/${city.slug}`,
                Cookie: `accepted-city=${city.id}; currentCity=${city.id}`
            }
        });

        if (!res.ok) {
            console.log(city.title, res.status);
            return null;
        }

        return await res.json();
    } catch (e) {
        console.error(city.title, e);
        return null;
    }
}

async function processCity(
    city: City,
    emit: (r: RawClinicRecord) => void
) {
    console.log("START", city.title);

    const parsedAt = new Date().toISOString();

    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page++) {
        const url =
            `${BASE_URL}?lang=ru-RU` +
            `&city_id=${city.id}` +
            `&city_slug=${city.slug}` +
            `&search=` +
            `&per-page=100` +
            `&page=${page}`;

        const json = await fetchJson(url, city);

        if (!json)
            break;

        const categories = json.data;

        if (!Array.isArray(categories))
            break;

        let added = 0;

        for (const category of categories) {
            const analysis = category.analysis;

            if (!Array.isArray(analysis))
                continue;

            for (const item of analysis) {
                const title =
                    item.translation?.title ??
                    item.name ??
                    item.slug;

                const price = item.price?.price;

                if (!title || !price)
                    continue;

                const key = title + "|" + price;

                if (seen.has(key))
                    continue;

                seen.add(key);

                emit({
                    clinic_id: `kdl-${city.slug}`,
                    clinic_name: "KDL",
                    city: city.title,
                    address: "",
                    phone: "",
                    working_hours: "",
                    source_url: url,
                    service_name_raw: title,
                    category: "лаборатория",
                    price_kzt: Number(price),
                    currency: "KZT",
                    duration_days:
                        item.price?.min_duration ?? 1,
                    parsed_at: parsedAt,
                    is_active: true
                });

                added++;
            }
        }

        console.log(
            city.title,
            "page",
            page,
            "added",
            added
        );

        if (added === 0)
            break;

        //
        // If API ignored page parameter,
        // next page will contain exactly the same services.
        //
        if (page > 1 && added === seen.size) {
            break;
        }
    }

    console.log(
        "DONE",
        city.title,
        seen.size
    );
}

export async function parseKdlPrices(): Promise<RawClinicRecord[]> {
    const res = await fetch(
        "https://www.kdlolymp.kz/api/area?cities=true&lang=ru-RU",
        {
            headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        }
    );

    if (!res.ok)
        throw new Error("Cannot load cities");

    const json = await res.json();

    const cities: City[] = [];

    for (const area of json.data ?? []) {
        for (const city of area.cities ?? []) {
            if (!city.is_active)
                continue;

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

    const results: RawClinicRecord[] = [];

    let next = 0;

    async function worker() {
        console.log("Worker started");
        while (true) {
            const i = next++;
console.log("City index", i);


            if (i >= cities.length)
                return;

            try {
                await processCity(
                    cities[i],
                    r => results.push(r)
                );
            } catch (e) {
                console.error(
                    cities[i].title,
                    e
                );
            }
        }
    }
console.log("Loaded", cities.length, "cities");

console.log("Before workers");
    await Promise.all(
        Array.from(
            { length: CONCURRENCY },
            worker
        )
    );
console.log("After workers");

    console.log(
        "Collected",
        results.length,
        "offers"
    );

    return results;
}