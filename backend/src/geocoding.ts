import { MapLocation } from "./models";

/** Coordinates of major Kazakhstan cities (city center) */
export const CITY_CENTERS: Record<string, MapLocation> = {
    "Алматы": { lat: 43.2567, lng: 76.9286 },
    "Астана": { lat: 51.1605, lng: 71.4704 },
    "Шымкент": { lat: 42.3417, lng: 69.5901 },
    "Караганда": { lat: 49.8047, lng: 73.1094 },
    "Актобе": { lat: 50.2839, lng: 57.167 },
    "Павлодар": { lat: 52.287, lng: 76.9667 },
    "Усть-Каменогорск": { lat: 49.948, lng: 82.6289 },
    "Семей": { lat: 50.4111, lng: 80.2275 },
    "Атырау": { lat: 47.1164, lng: 51.9225 },
    "Костанай": { lat: 53.2144, lng: 63.6246 },
    "Кызылорда": { lat: 44.8528, lng: 65.5092 },
    "Петропавловск": { lat: 54.8753, lng: 69.1628 },
    "Тараз": { lat: 42.9, lng: 71.3667 },
    "Актау": { lat: 43.65, lng: 51.16 },
    "Уральск": { lat: 51.2278, lng: 51.3867 }
};

export const MAIN_CITY_NAMES = Object.keys(CITY_CENTERS);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hashSeed(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/** Spread markers around city center so clinics don't stack on one pin */
export function jitterLocation(
    center: MapLocation,
    seed: string,
    maxKm = 6
): MapLocation {
    const h = hashSeed(seed);
    const angle = (h % 360) * Math.PI / 180;
    const dist = ((h >> 8) % 1000) / 1000 * maxKm;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
    return { lat: center.lat + dLat, lng: center.lng + dLng };
}

function parseCoord(value: unknown): number | undefined {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function extractRawCoords(raw: unknown): MapLocation | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;

    let lat = parseCoord(obj.lat ?? obj.latitude);
    let lng = parseCoord(obj.lng ?? obj.longitude ?? obj.lon);

    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
        lng = parseCoord(obj.coordinates[0]);
        lat = parseCoord(obj.coordinates[1]);
    }

    if (lat === undefined || lng === undefined) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { lat, lng };
}

function isNearCity(coords: MapLocation, city: string, maxKm = 80): boolean {
    const center = CITY_CENTERS[city];
    if (!center) return true;
    return haversineKm(coords.lat, coords.lng, center.lat, center.lng) <= maxKm;
}

/** Normalize API location; reject coords that don't match the clinic's city */
export function normalizeLocation(
    raw: unknown,
    city: string,
    clinicId: string
): MapLocation | undefined {
    const center = CITY_CENTERS[city];
    const parsed = extractRawCoords(raw);

    if (parsed && isNearCity(parsed, city)) {
        return parsed;
    }

    if (center) {
        return jitterLocation(center, clinicId);
    }

    return parsed ?? undefined;
}

export function cityLocation(city: string, clinicId: string): MapLocation | undefined {
    const center = CITY_CENTERS[city];
    if (!center) return undefined;
    return jitterLocation(center, clinicId);
}
