import { Agent, fetch } from "undici";

import { RawClinicRecord } from "../models";
import { normalizeLocation } from "../geocoding";

import { DOQ_MAX_CITIES, DOQ_MAX_DOCTOR_PAGES, limitCities } from "./config";

interface DoqCity {
    id: number;
    slug: string;
    name: string;
}



const PAGE_SIZE = 100;



const dispatcher = new Agent({

    connections: 50,

    pipelining: 1,

    keepAliveTimeout: 30000,

    bodyTimeout: 15000,

    headersTimeout: 30000

});



const HEADERS = {

    Accept: "application/json",

    "User-Agent": "Mozilla/5.0"

};



async function getJson<T>(url: string): Promise<T | null> {

    const res = await fetch(url, { dispatcher, headers: HEADERS });

    if (!res.ok) return null;

    return (await res.json()) as T;

}



async function fetchAllDoctors(cityId: number): Promise<any[]> {
    const base =
        `https://api.doq.kz/api/v1/doctors/?city=${cityId}` +
        `&limit=${PAGE_SIZE}&expand=services,clinic_branches`;

    const first = await getJson<any>(`${base}&offset=0`);
    if (!first?.results) return [];

    const total: number = first.count ?? first.results.length;
    const cap = Math.min(total, DOQ_MAX_DOCTOR_PAGES * PAGE_SIZE);
    const results: any[] = [...first.results];

    if (cap <= PAGE_SIZE) return results;

    const offsets: number[] = [];
    for (let offset = PAGE_SIZE; offset < cap; offset += PAGE_SIZE) {
        offsets.push(offset);
    }

    for (const offset of offsets) {
        try {
            const page = await getJson<any>(`${base}&offset=${offset}`);
            if (page?.results) results.push(...page.results);
        } catch (err: any) {
            console.warn(`DOQ city ${cityId} offset ${offset}:`, err?.message ?? err);
        }
    }

    return results;
}



function branchRating(branch: any): number {

    const score = Number(branch?.feedback_score);

    if (!Number.isFinite(score)) return 4.2;

    return Math.min(5, Math.round((score / 10) * 5 * 10) / 10);

}



function doctorsToRecords(

    city: any,

    doctors: any[],

    parsedAt: Date

): RawClinicRecord[] {

    const out: RawClinicRecord[] = [];

    const seen = new Set<string>();



    for (const doctor of doctors) {

        const services: any[] = doctor.services ?? [];

        if (!services.length) continue;



        const branches: any[] = doctor.clinic_branches ?? [];

        const branchById = new Map<number, any>(

            branches.map(b => [b.id, b])

        );



        for (const s of services) {

            const name = s.service?.name;

            const price = s.total ?? s.price ?? s.base_price;



            if (!name || !price || Number(price) <= 0) continue;



            const branch =

                branchById.get(s.clinic_branch) ?? branches[0];

            if (!branch) continue;



            const clinicId = `doq-${city.id}-${branch.clinic ?? branch.id}`;

            const dedupeKey = `${clinicId}|${name}|${price}`;

            if (seen.has(dedupeKey)) continue;

            seen.add(dedupeKey);



            const doctorUrl = doctor.slug
                ? `https://doq.kz/doctors/${doctor.slug}`
                : branch.clinic_slug
                    ? `https://doq.kz/clinics/${city.slug}/${branch.clinic_slug}`
                    : `https://doq.kz/?city=${city.slug}`;

            out.push({

                clinic_id: clinicId,

                clinic_name: branch.name ?? doctor.full_name ?? "Клиника DOQ",

                city: city.name,

                address: branch.address ?? "не указан",

                phone: branch.phones?.[0] ?? doctor.phone ?? "",

                working_hours: "09:00-20:00",

                source_url: doctorUrl,

                service_name_raw: name,

                category: "приём врача",

                price_kzt: Number(price),

                currency: "KZT",

                duration_days: 0,

                parsed_at: parsedAt,

                is_active: true,

                location: normalizeLocation(branch.location, city.name, clinicId),

                online_booking: true,

                rating: branchRating(branch)

            });

        }

    }



    return out;

}



export async function parseDoqPrices(): Promise<RawClinicRecord[]> {

    const parsedAt = new Date();



    const citiesPayload = await getJson<any>(

        "https://api.doq.kz/api/v1/cities"

    );

    if (!citiesPayload?.results) {

        throw new Error("DOQ: cannot load cities");

    }



    const cities = limitCities<DoqCity>(
        citiesPayload.results as DoqCity[],
        DOQ_MAX_CITIES
    );



    console.log(

        "DOQ:",

        cities.length,

        "cities —",

        cities.map(c => c.name).join(", ")

    );



    const perCity: RawClinicRecord[][] = [];

    for (const city of cities) {
        try {
            const doctors = await fetchAllDoctors(city.id);
            const records = doctorsToRecords(city, doctors, parsedAt);
            console.log(`DOQ ${city.name}: ${records.length} offers`);
            perCity.push(records);
        } catch (err: any) {
            console.warn(`DOQ ${city.name} failed:`, err?.message ?? err);
            perCity.push([]);
        }
    }

    const results = perCity.flat();

    console.log("DOQ total:", results.length);

    return results;

}


