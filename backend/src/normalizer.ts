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
 * =========================
 * NORMALIZATION CORE
 * =========================
 */

function normalizeKey(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/\s+/g, " ")
        // remove all bracket content (VERY IMPORTANT for your dataset)
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Remove common lab noise patterns
 */
function stripMedicalNoise(value: string): string {
    return value
        // remove method noise
        .replace(/хроматография|иммуноблоттинг|анализатор|экспертное|скрининг/gi, "")
        // unify Ig variants spacing
        .replace(/ig\s*g/gi, "IgG")
        .replace(/ig\s*m/gi, "IgM")
        .replace(/\s+/g, " ")
        .trim();
}

/** Invitro/KDL often prefix service names with numeric codes */
function stripLeadingCode(value: string): string {
    return value.replace(/^[A-Za-z]?\d+[\s.\-–—]*/, "").trim();
}

/**
 * FINAL NORMALIZED KEY
 */
function buildKey(value: string): string {
    return stripMedicalNoise(normalizeKey(stripLeadingCode(value)));
}

/**
 * =========================
 * HASH (for unmatched)
 * =========================
 */

function hashStr(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h).toString(36);
}

/**
 * =========================
 * SYNONYM MAP (O(1))
 * =========================
 */

const synonymMap: Map<string, NormalizedService> = (() => {
    const map = new Map<string, NormalizedService>();

    for (const norm in serviceSynonyms) {
        const service = serviceCatalog.find(
            (item) => item.service_name_norm === norm
        );

        if (!service) continue;

        const synonyms = serviceSynonyms[norm];

        for (let i = 0; i < synonyms.length; i++) {
            const key = buildKey(synonyms[i]);

            if (!map.has(key)) {
                map.set(key, service);
            }
        }
    }

    return map;
})();

/**
 * =========================
 * MAIN NORMALIZER
 * =========================
 */

export function normalizeService(
    raw: RawClinicRecord
): ClinicServiceOffer {
    const key = buildKey(raw.service_name_raw);
    const matched = synonymMap.get(key);

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

    const fallbackId = `unmatched-${hashStr(key)}`;

    return {
        ...raw,
        service_id: fallbackId,
        service_name_norm: raw.service_name_raw,
        category: raw.category ?? "прочее",
        price_kzt: raw.price_kzt,
        currency: "KZT"
    };
}

/**
 * =========================
 * UNMATCHED QUEUE
 * =========================
 */

export function getUnmatchedQueue(
    records: RawClinicRecord[]
): RawClinicRecord[] {
    const result: RawClinicRecord[] = [];

    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const key = buildKey(r.service_name_raw);

        if (!synonymMap.has(key)) {
            result.push(r);
        }
    }

    return result;
}