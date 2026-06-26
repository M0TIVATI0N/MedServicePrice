export type Currency = 'KZT' | 'USD';
export type Category = 'лаборатория' | 'приём врача' | 'диагностика' | 'процедура' | 'прочее';

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
  parsed_at: string;
  is_active: boolean;
  location?: MapLocation;
  raw_hash?: string;
}

export interface NormalizedService {
  service_id: string;
  service_name_norm: string;
  category: Category;
}

export interface ClinicServiceOffer extends RawClinicRecord {
  service_id: string;
  service_name_norm: string;
}

export interface PriceHistoryEntry {
  clinic_id: string;
  service_id: string;
  clinic_name: string;
  service_name_norm: string;
  price_kzt: number;
  parsed_at: string;
  source_url: string;
}
