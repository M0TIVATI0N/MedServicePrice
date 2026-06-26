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
  const city = 4;
  const clinicsUrl = `https://api.doq.kz/api/v1/clinics/?city=${city}&expand=clinic_branches&limit=100`;
  const clinicsPayload = await fetchJson<{ results?: DoqClinicItem[] }>(clinicsUrl);
  console.log((clinicsPayload.results ?? []).length);
  const offers: RawClinicRecord[] = [];

  for (const clinic of clinicsPayload.results ?? []) {
    const branch = clinic.clinic_branches?.[0];
    if (!branch) {
      continue;
    }

    const doctorsUrl = `https://api.doq.kz/api/v1/doctors/?city=${city}&clinic=${clinic.id}&clinic_branch=${branch.id}&limit=100&expand=clinic_branches,services`;
    try {
      const doctorsPayload = await fetchJson<{ results?: DoqDoctorItem[] }>(doctorsUrl);
      for (const doctor of doctorsPayload.results ?? []) {
        const doctorBranch = doctor.clinic_branches?.[0] ?? branch;
        for (const serviceEntry of doctor.services ?? []) {
          const serviceName = serviceEntry.service?.name;
          const price = serviceEntry.price ?? serviceEntry.base_price ?? serviceEntry.total;
          if (!serviceName || !price || price <= 0) {
            continue;
          }

          offers.push({
            clinic_id: `doq-${clinic.slug}-${doctorBranch.id}`,
            clinic_name: clinic.name,
            city: 'Караганда',
            address: doctorBranch.address || 'не указан',
            phone: doctorBranch.phones?.find(Boolean) || '',
            working_hours: '09:00-20:00',
            source_url: `https://doq.kz/clinics/karaganda/${clinic.slug}`,
            service_name_raw: serviceName,
            category: buildCategory(serviceEntry.service?.type),
            price_kzt: Number(price),
            currency: 'KZT',
            duration_days: 0,
            parsed_at: new Date().toISOString(),
            is_active: true,
            location: doctorBranch.location
          });
        }
      }
    } catch {
      continue;
    }
  }

  return offers;
}
