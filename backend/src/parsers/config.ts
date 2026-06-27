/** Limits tuned for MongoDB Atlas M0 + reasonable coverage */

function envInt(name: string, fallback: number): number {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const PRIORITY_CITY_SLUGS = [
    "almaty",
    "astana",
    "shymkent",
    "karaganda",
    "aktobe",
    "pavlodar",
    "ust-kamenogorsk",
    "atyrau",
    "kostanay",
    "kyzylorda",
    "petropavlovsk",
    "taraz"
];

export const PRIORITY_CITY_NAMES = new Set([
    "Алматы",
    "Астана",
    "Шымкент",
    "Караганда",
    "Актобе",
    "Павлодар",
    "Усть-Каменогорск",
    "Семей",
    "Атырау",
    "Костанай",
    "Кызылорда",
    "Петропавловск",
    "Тараз",
    "Актау",
    "Уральск"
]);

export const KDL_MAX_CITIES = envInt("KDL_MAX_CITIES", 0);
export const INVITRO_MAX_CITIES = envInt("INVITRO_MAX_CITIES", 0);
export const DOQ_MAX_CITIES = envInt("DOQ_MAX_CITIES", 0);
export const HELIX_MAX_CITIES = envInt("HELIX_MAX_CITIES", 0);
export const GEMOTEST_MAX_CITIES = envInt("GEMOTEST_MAX_CITIES", 0);
/** Max paginated doctor-list requests per DOQ city (100 doctors each) */
export const DOQ_MAX_DOCTOR_PAGES = envInt("DOQ_MAX_DOCTOR_PAGES", 8);

/** Invitro category IDs — small HTML pages (~15–50 tests each) */
export const INVITRO_CATEGORY_IDS = (
    process.env.INVITRO_CATEGORIES ?? "156,157,171,140"
)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

export const PARSER_MAX_RECORDS = envInt("PARSER_MAX_RECORDS", 200000);
export const PARSER_STORE_RAW = process.env.PARSER_STORE_RAW === "true";
/** Only wipe DB when explicitly enabled — avoids empty DB after failed parse */
export const PARSER_REPLACE_DB = process.env.PARSER_REPLACE_DB === "true";

export function pickPriorityCities<T extends { slug?: string; name?: string }>(
    cities: T[],
    max: number
): T[] {
    const ranked = [...cities].sort((a, b) => {
        const slugA = (a.slug ?? "").toLowerCase();
        const slugB = (b.slug ?? "").toLowerCase();
        const nameA = a.name ?? "";
        const nameB = b.name ?? "";

        const priA = PRIORITY_CITY_SLUGS.indexOf(slugA);
        const priB = PRIORITY_CITY_SLUGS.indexOf(slugB);
        const slugScoreA = priA >= 0 ? priA : 999;
        const slugScoreB = priB >= 0 ? priB : 999;

        if (slugScoreA !== slugScoreB) return slugScoreA - slugScoreB;

        const namePriA = PRIORITY_CITY_NAMES.has(nameA) ? 0 : 1;
        const namePriB = PRIORITY_CITY_NAMES.has(nameB) ? 0 : 1;
        if (namePriA !== namePriB) return namePriA - namePriB;

        return nameA.localeCompare(nameB, "ru");
    });

    return ranked.slice(0, max);
}

/** 0 or >= length → all cities; otherwise priority subset */
export function limitCities<T extends { slug?: string; name?: string }>(
    cities: T[],
    max: number
): T[] {
    if (max <= 0 || max >= cities.length) return cities;
    return pickPriorityCities(cities, max) as T[];
}

export function capRecords<T>(records: T[], label: string): T[] {
    if (records.length <= PARSER_MAX_RECORDS) return records;
    console.warn(
        `${label}: capping ${records.length} → ${PARSER_MAX_RECORDS} records`
    );
    return records.slice(0, PARSER_MAX_RECORDS);
}
