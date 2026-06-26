import dotenv from 'dotenv';
import mongoose, { Document, model, Schema } from 'mongoose';
import { Currency, MapLocation, RawClinicRecord, ClinicServiceOffer, PriceHistoryEntry } from './models';

dotenv.config();
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medserviceprice';

export async function connectDB() {
    console.log(process.cwd());
  return mongoose.connect(mongoUri, { autoIndex: true });
}

const locationSchema = new Schema<MapLocation>({
  lat: { type: Number, required: false },
  lng: { type: Number, required: false }
});

export interface RawRecordDoc extends RawClinicRecord, Document {}

const RawRecordSchema = new Schema<RawRecordDoc>({
  clinic_id: { type: String, required: true },
  clinic_name: String,
  city: String,
  address: String,
  phone: String,
  working_hours: String,
  source_url: String,
  service_name_raw: String,
  category: String,
  price_kzt: Number,
  currency: String,
  duration_days: Number,
  parsed_at: Date,
  is_active: Boolean,
  location: { type: locationSchema, required: false },
  raw_hash: { type: String, required: true, unique: true }
}, { timestamps: true });

RawRecordSchema.index({ raw_hash: 1 }, { unique: true });

export const RawRecord = model<RawRecordDoc>('RawRecord', RawRecordSchema);

export interface OfferRecordDoc extends ClinicServiceOffer, Document {}

const OfferRecordSchema = new Schema<OfferRecordDoc>({
  clinic_id: { type: String, required: true },
  clinic_name: String,
  city: String,
  address: String,
  phone: String,
  working_hours: String,
  source_url: String,
  service_id: String,
  service_name_raw: String,
  service_name_norm: String,
  category: String,
  price_kzt: Number,
  currency: String,
  duration_days: Number,
  parsed_at: Date,
  is_active: Boolean,
  location: { type: locationSchema, required: false }
}, { timestamps: true });

OfferRecordSchema.index({ clinic_id: 1, service_id: 1, source_url: 1 }, { unique: true });

export const OfferRecord = model<OfferRecordDoc>('OfferRecord', OfferRecordSchema);

export interface PriceHistoryDoc extends PriceHistoryEntry, Document {}

const PriceHistorySchema = new Schema<PriceHistoryDoc>({
  clinic_id: { type: String, required: true },
  service_id: String,
  clinic_name: String,
  service_name_norm: String,
  price_kzt: Number,
  parsed_at: Date,
  source_url: String
}, { timestamps: true });

PriceHistorySchema.index({ clinic_id: 1, service_id: 1, parsed_at: -1 });

export const PriceHistory = model<PriceHistoryDoc>('PriceHistory', PriceHistorySchema);
