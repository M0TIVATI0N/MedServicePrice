import pLimit from "p-limit";
import { RawClinicRecord } from "../models";

const CITY_CONCURRENCY = 5;
const CLINIC_CONCURRENCY = 10;
const DOCTOR_CONCURRENCY = 20;

const cityLimit = pLimit(CITY_CONCURRENCY);
const clinicLimit = pLimit(CLINIC_CONCURRENCY);
const doctorLimit = pLimit(DOCTOR_CONCURRENCY);

async function safeFetchJson<T>(url: string): Promise<T | null> {
    try {
        const res = await fetch(url, {
            headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" }
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

export async function parseDoqPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date();
    const offers: RawClinicRecord[] = [];

    const citiesPayload = await safeFetchJson<any>(
        "https://api.doq.kz/api/v1/cities"
    );

    const cities = citiesPayload?.results ?? [];

    await Promise.all(
        cities.map((city: any) =>
            cityLimit(async () => {
                const clinicsPayload = await safeFetchJson<any>(
                    `https://api.doq.kz/api/v1/clinics/?city=${city.id}&expand=clinic_branches&limit=100`
                );

                const clinics = clinicsPayload?.results ?? [];

                await Promise.all(
                    clinics.map((clinic: any) =>
                        clinicLimit(async () => {
                            const branch = clinic.clinic_branches?.[0];
                            if (!branch) return;

                            const doctorsPayload = await safeFetchJson<any>(
                                `https://api.doq.kz/api/v1/doctors/?city=${city.id}&clinic=${clinic.id}&clinic_branch=${branch.id}&limit=100&expand=clinic_branches,services`
                            );

                            const doctors = doctorsPayload?.results ?? [];

                            await Promise.all(
                                doctors.map((doctor: any) =>
                                    doctorLimit(() => {
                                        const services = doctor.services ?? [];
                                        const doctorBranch =
                                            doctor.clinic_branches?.[0] ?? branch;

                                        for (let i = 0; i < services.length; i++) {
                                            const s = services[i];

                                            const name = s.service?.name;
                                            const price =
                                                s.price ?? s.base_price ?? s.total;

                                            if (!name || !price || price <= 0) continue;

                                            offers.push({
                                                clinic_id: `doq-${city.id}-${clinic.id}`,
                                                clinic_name: clinic.name,
                                                city: city.name,
                                                address: doctorBranch.address ?? "не указан",
                                                phone: doctorBranch.phones?.[0] ?? "",
                                                working_hours: "09:00-20:00",
                                                source_url: `https://doq.kz/clinics/${city.slug}/${clinic.slug}`,
                                                service_name_raw: name,
                                                category: "приём врача",
                                                price_kzt: Number(price),
                                                currency: "KZT",
                                                duration_days: 0,
                                                parsed_at: parsedAt,
                                                is_active: true,
                                                location: doctorBranch.location
                                            });
                                        }
                                    })
                                )
                            );
                        })
                    )
                );
            })
        )
    );

    return offers;
}