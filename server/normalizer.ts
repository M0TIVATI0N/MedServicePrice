import { ClinicServiceOffer, NormalizedService, RawClinicRecord } from './models';
import { serviceCatalog, serviceSynonyms } from './service-catalog';

const synonymMap: Record<string, NormalizedService> = Object.entries(serviceSynonyms).reduce(
  (acc, [norm, synonyms]) => {
    synonyms.forEach((value) => {
      acc[value.toLowerCase()] = serviceCatalog.find((item) => item.service_name_norm === norm)!;
    });
    return acc;
  }, {} as Record<string, NormalizedService>);

function createUnmatchedServiceId(value: string) {
  return `unmatched-${value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-я0-9-]/gi, '')}`;
}

export function normalizeService(raw: RawClinicRecord): ClinicServiceOffer {
  const normalizedKey = raw.service_name_raw.trim().toLowerCase();
  const matched = synonymMap[normalizedKey];
  const service = matched ?? {
    service_id: createUnmatchedServiceId(raw.service_name_raw),
    service_name_norm: raw.service_name_raw,
    category: raw.category
  };

  return {
    ...raw,
    service_id: service.service_id,
    service_name_norm: service.service_name_norm,
    category: service.category,
    price_kzt: raw.price_kzt,
    currency: 'KZT'
  };
}

export function getUnmatchedQueue(records: RawClinicRecord[]): RawClinicRecord[] {
  return records.filter((record) => {
    const normalizedKey = record.service_name_raw.trim().toLowerCase();
    return !synonymMap[normalizedKey];
  });
}
