import { RawClinicRecord } from "../models";

interface City {
    id: number;
    slug: string;
    title: string;
}

const CONCURRENCY = 6;
const PER_PAGE = 100;

const BASE_URL = "https://www.kdlolymp.kz/api/analysis-data";

async function fetchJson(url: string, city: City) {
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
            const text = await res.text();
            console.log("BAD RESPONSE:", text.slice(0, 200));
            return null;
        }

        const data = await res.json().catch((e) => {
            console.log("INVALID JSON:", e);
            return null;
        });

        return data;
    } catch (err) {
        console.log("FETCH ERROR:", err);
        return null;
    }
}

function extractOffers(
    json: any,
    city: City,
    url: string,
    parsedAt: string
): RawClinicRecord[] {
    const out: RawClinicRecord[] = [];

    const categories = json?.data;
    if (!categories) return out;

    for (let i = 0; i < categories.length; i++) {
        const analyses = categories[i]?.analysis;
        if (!analyses) continue;

        for (let j = 0; j < analyses.length; j++) {
            const item = analyses[j];
            const price = item?.price?.price;

            if (!price) continue;

            out.push({
                clinic_id: `kdl-${city.slug}-main`,
                clinic_name: "KDL",
                city: city.title,
                address: "",
                phone: "",
                working_hours: "",
                source_url: url,
                service_name_raw:
                    item?.translation?.title ??
                    item?.name ??
                    item?.slug ??
                    "",
                category: "лаборатория",
                price_kzt: price,
                currency: "KZT",
                duration_days: item?.price?.min_duration ?? 1,
                parsed_at: parsedAt,
                is_active: true
            });
        }
    }

    return out;
}

async function processCity(city: City, emit: (o: RawClinicRecord) => void) {
  let page = 1;
  const parsedAt = new Date().toISOString();
  const seenPages = new Set<number>();

  while (page <= 200) {
    if (seenPages.has(page)) break;
    seenPages.add(page);

    const url = `${BASE_URL}?lang=ru-RU&city_id=${city.id}&city_slug=${city.slug}&search=&per-page=${PER_PAGE}&page=${page}`;
    const json = await fetchJson(url, city);
    if (!json) break;

    const categories = json?.data;
    if (!Array.isArray(categories) || categories.length === 0) break;

    let pageItems = 0;

    for (const category of categories) {
      for (const item of category?.analysis ?? []) {
        const price = item?.price?.price;
        if (!price) continue;

        emit({
          clinic_id: `kdl-${city.slug}-main`,
          clinic_name: "KDL",
          city: city.title,
          address: "",
          phone: "",
          working_hours: "",
          source_url: url,
          service_name_raw: item?.translation?.title ?? item?.name ?? item?.slug ?? "",
          category: "лаборатория",
          price_kzt: price,
          currency: "KZT",
          duration_days: item?.price?.min_duration ?? 1,
          parsed_at: parsedAt,
          is_active: true
        });

        pageItems++;
      }
    }

    if (pageItems === 0 || pageItems < PER_PAGE) break;
    page++;
  }
}

export async function parseKdlPrices(): Promise<RawClinicRecord[]> {
    const citiesRes = await fetch(
        "https://www.kdlolymp.kz/api/area?cities=true&lang=ru-RU",
        {
            headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        }
    );

    if (!citiesRes.ok) {
        throw new Error(`Failed to load cities (${citiesRes.status})`);
    }

    const citiesJson = await citiesRes.json();

    const cities: City[] = [];

    for (let i = 0; i < (citiesJson.data ?? []).length; i++) {
        const area = citiesJson.data[i];
        const list = area?.cities;

        if (!list) continue;

        for (let j = 0; j < list.length; j++) {
            const city = list[j];
            if (!city.is_active) continue;

            cities.push({
                id: city.id,
                slug: city.slug,
                title:
                    city.translation?.title ??
                    city.translation?.name ??
                    city.slug
            });
        }
    }

    console.log(`Loaded ${cities.length} cities`);

    const results: RawClinicRecord[] = [];

    let index = 0;

    const emit = (item: RawClinicRecord) => {
        results.push(item);
    };

    async function worker() {
        while (true) {
            const i = index++;
            if (i >= cities.length) break;

            await processCity(cities[i], emit);
        }
    }

    await Promise.all(
        Array.from({ length: CONCURRENCY }, () => worker())
    );

    console.log(`Collected ${results.length} offers`);

    return results;
}