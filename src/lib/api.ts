/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export interface MapLocation {
  lat: number;
  lng: number;
}

export interface ServiceOffer {
  clinic_id: string;
  clinic_name: string;
  city: string;
  address: string;
  phone: string;
  working_hours: string;
  source_url: string;
  service_id: string;
  service_name_raw: string;
  service_name_norm: string;
  category: string;
  price_kzt: number;
  parsed_at: string;
  location?: MapLocation;
}

export interface Clinic {
  _id: string;
  clinic_id: string;
  clinic_name: string;
  city: string;
  address: string;
  phone: string;
  working_hours: string;
  source_url: string;
  location?: MapLocation;
  services: ServiceOffer[];
}

export interface PriceHistoryItem {
  price_kzt: number;
  parsed_at: string;
}

export const fetchServices = async (params: any): Promise<{count: number, data: ServiceOffer[]}> => {
  const { data } = await api.get('/services', { params });
  return data;
};

export const fetchClinics = async (params: any): Promise<Clinic[]> => {
  const { data } = await api.get('/clinics', { params });
  return data;
};

export const fetchHistory = async (params: any): Promise<PriceHistoryItem[]> => {
  const { data } = await api.get('/history', { params });
  return data;
};

export const fetchCatalog = async () => {
    const { data } = await api.get('/catalog');
    return data;
}
