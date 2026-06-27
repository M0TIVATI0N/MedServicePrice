import { RawClinicRecord } from '../models';

interface DoqClinicBranch {
  id: number;
  address?: string;
  location?: { lat: number; lng: number };
  phones?: string[];
  schedule?: { items?: Array<{ day_of_the_week: number; start_time?: string; end_time?: string; around_the_clock?: boolean }> };
}

interface DoqClinicItem {
  id: number;
  name: string;
  slug: string;
  clinic_branches?: DoqClinicBranch[];
}

interface DoqDoctorService {
  service?: { name?: string; type?: string };
  price?: number | null;
  base_price?: number | null;
  total?: number | null;
}

interface DoqDoctorItem {
  clinic_branches?: DoqClinicBranch[];
  services?: DoqDoctorService[];
}
const cities = [
  { id: 1, slug: "astana", name: "Астана" },
  { id: 2, slug: "almaty", name: "Алматы" },
  { id: 3, slug: "shymkent", name: "Шымкент" },
  { id: 4, slug: "karaganda", name: "Караганда" },
  { id: 5, slug: "aktobe", name: "Актобе" },
  { id: 6, slug: "atyrau", name: "Атырау" },
  { id: 7, slug: "aktau", name: "Актау" },
  { id: 8, slug: "kostanay", name: "Костанай" },
  { id: 9, slug: "kokshetau", name: "Кокшетау" },
  { id: 10, slug: "kyzylorda", name: "Кызылорда" },
  { id: 11, slug: "pavlodar", name: "Павлодар" },
  { id: 12, slug: "petropavlovsk", name: "Петропавловск" },
  { id: 13, slug: "semey", name: "Семей" },
  { id: 14, slug: "ust-kamenogorsk", name: "Усть-Каменогорск" },
  { id: 15, slug: "taraz", name: "Тараз" },
  { id: 16, slug: "taldykorgan", name: "Талдыкорган" },
  { id: 17, slug: "turkestan", name: "Туркестан" },
  { id: 18, slug: "uralsk", name: "Уральск" },
  { id: 19, slug: "zhezkazgan", name: "Жезказган" },
];
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function buildCategory(serviceType?: string): RawClinicRecord['category'] {
  if (serviceType === 'procedure') {
    return 'процедура';
  }
  if (serviceType === 'initial-appointment') {
    return 'приём врача';
  }
  return 'прочее';
}

export async function parseDoqPrices(): Promise<RawClinicRecord[]> {
    const parsedAt = new Date().toISOString();

    const cityResults = await Promise.all(
        cities.map(async (city) => {
            try {
                const clinicsPayload = await fetchJson<{ results?: DoqClinicItem[] }>(
                    `https://api.doq.kz/api/v1/clinics/?city=${city.id}&expand=clinic_branches&limit=100`
                );

                const clinicResults = await Promise.all(
                    (clinicsPayload.results ?? []).map(async (clinic) => {
                        const branch = clinic.clinic_branches?.[0];
                        if (!branch) return [];

                        try {
                            const doctorsPayload =
                                await fetchJson<{ results?: DoqDoctorItem[] }>(
                                    `https://api.doq.kz/api/v1/doctors/?city=${city.id}` +
                                    `&clinic=${clinic.id}` +
                                    `&clinic_branch=${branch.id}` +
                                    `&limit=100` +
                                    `&expand=clinic_branches,services`
                                );

                            const offers: RawClinicRecord[] = [];

                            for (const doctor of doctorsPayload.results ?? []) {
                                const doctorBranch =
                                    doctor.clinic_branches?.[0] ?? branch;

                                for (const serviceEntry of doctor.services ?? []) {
                                    const serviceName = serviceEntry.service?.name;

                                    const price =
                                        serviceEntry.price ??
                                        serviceEntry.base_price ??
                                        serviceEntry.total;

                                    if (!serviceName || !price || price <= 0)
                                        continue;

                                    offers.push({
                                        clinic_id: `doq-${city.id}-${clinic.id}`,
                                        clinic_name: clinic.name,
                                        city: city.name,
                                        address: doctorBranch.address || "не указан",
                                        phone: doctorBranch.phones?.find(Boolean) || "",
                                        working_hours: "09:00-20:00",
                                        source_url: `https://doq.kz/clinics/${city.slug}/${clinic.slug}`,
                                        service_name_raw: serviceName,
                                        category: buildCategory(serviceEntry.service?.type),
                                        price_kzt: Number(price),
                                        currency: "KZT",
                                        duration_days: 0,
                                        parsed_at: parsedAt,
                                        is_active: true,
                                        location: doctorBranch.location
                                    });
                                }
                            }

                            return offers;
                        } catch (err) {
                            console.error(
                                `Doctors failed for ${clinic.name} (${city.name})`
                            );
                            return [];
                        }
                    })
                );

                return clinicResults.flat();
            } catch (err) {
                console.error(`City ${city.name} failed`);
                return [];
            }
        })
    );

    const offers = cityResults.flat();

    const cityStats = offers.reduce((acc, item) => {
        acc[item.city] = (acc[item.city] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log("TOTAL:", offers.length);

    return offers;
}