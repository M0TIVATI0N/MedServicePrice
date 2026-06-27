import {
    ClinicServiceOffer,
    NormalizedService,
    RawClinicRecord
} from "./models";

import {
    serviceCatalog,
    serviceSynonyms
} from "./service-catalog";

/**
 * 🚀 Precomputed O(1) lookup map
 * replaces slow Object.entries + .find() chain
 */
const synonymMap: Record<string, NormalizedService> = (() => {
    const map: Record<string, NormalizedService> = {};

    for (const norm in serviceSynonyms) {
        const synonyms = serviceSynonyms[norm];

        const service = serviceCatalog.find(
            (item) => item.service_name_norm === norm
        );

        if (!service) continue;

        for (let i = 0; i < synonyms.length; i++) {
            map[synonyms[i].toLowerCase()] = service;
        }
    }

    return map;
})();

/**
 * Fast reusable string normalizer
 * avoids repeated chaining allocations
 */
function normalizeKey(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Faster regex-free slug generator (important hot path optimization)
 */
function createUnmatchedServiceId(value: string): string {
    let out = "unmatched-";
    const v = value.trim().toLowerCase();

    for (let i = 0; i < v.length; i++) {
        const c = v[i];

        if (
            (c >= "a" && c <= "z") ||
            (c >= "а" && c <= "я") ||
            (c >= "0" && c <= "9")
        ) {
            out += c;
        } else if (c === " " || c === "_") {
            out += "-";
        }
    }

    return out;
}

/**
 * 🔥 MAIN NORMALIZER (drop-in replacement)
 */
export function normalizeService(
    raw: RawClinicRecord
): ClinicServiceOffer {
    const key = normalizeKey(raw.service_name_raw);
    const matched = synonymMap[key];

    if (matched) {
        return {
            ...raw,
            service_id: matched.service_id,
            service_name_norm: matched.service_name_norm,
            category: matched.category,
            price_kzt: raw.price_kzt,
            currency: "KZT"
        };
    }

    const fallback = {
        service_id: createUnmatchedServiceId(raw.service_name_raw),
        service_name_norm: raw.service_name_raw,
        category: raw.category
    };

    return {
        ...raw,
        service_id: fallback.service_id,
        service_name_norm: fallback.service_name_norm,
        category: fallback.category,
        price_kzt: raw.price_kzt,
        currency: "KZT"
    };
}

/**
 * ⚡ Faster unmatched filter (no repeated trim/lowercase inside loop)
 */
export function getUnmatchedQueue(
    records: RawClinicRecord[]
): RawClinicRecord[] {
    const result: RawClinicRecord[] = [];

    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const key = normalizeKey(r.service_name_raw);

        if (!synonymMap[key]) {
            result.push(r);
        }
    }

    return result;
}