export type Currency = "KZT" | "USD";

export type Category =
    | "лаборатория"
    | "приём врача"
    | "диагностика"
    | "процедура"
    | "прочее";

export interface MapLocation {
    lat: number;
    lng: number;
}

export interface RawClinicRecord {
    clinic_id: string;
    clinic_name: string;
    city: string;
    address: string;
    phone: string;
    working_hours: string;
    source_url: string;

    service_name_raw: string;
    category: Category;

    price_kzt: number;
    currency: Currency;
    duration_days: number;

    // Store as a real Date in MongoDB
    parsed_at: Date;

    is_active: boolean;

    location?: MapLocation;
    raw_hash?: string;
    rating?: number;
    online_booking?: boolean;
}

export interface NormalizedService {
    service_id: string;
    service_name_norm: string;
    category: Category;
}

export interface ClinicServiceOffer extends RawClinicRecord {
    service_id: string;
    service_name_norm: string;
    source?: string;
}

export interface PriceHistoryEntry {
    clinic_id: string;
    service_id: string;

    clinic_name: string;
    service_name_norm: string;

    price_kzt: number;
    previous_price_kzt?: number;

    // Store as a real Date in MongoDB
    parsed_at: Date;

    source_url: string;
}

export interface ParseLogEntry {
    source: string;
    level: "error" | "info" | "warn";
    message: string;
    parsed_at: Date;
}