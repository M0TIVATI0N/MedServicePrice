import dotenv from "dotenv";
import mongoose, { Document, Model, Schema } from "mongoose";

import {
    MapLocation,
    RawClinicRecord,
    ClinicServiceOffer,
    PriceHistoryEntry
} from "./models";

dotenv.config();

const mongoUri =
    process.env.MONGODB_URI ??
    "mongodb://localhost:27017/medserviceprice";

/**
 * 🚀 Optimized connection (prevents multiple reconnect storms)
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDB() {
    if (connectionPromise) return connectionPromise;

    connectionPromise = mongoose.connect(mongoUri, {
        autoIndex: process.env.NODE_ENV !== "production",
        maxPoolSize: 50,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
    });

    return connectionPromise;
}

/* -------------------- SHARED OPTIONS -------------------- */

const schemaOptions = {
    timestamps: true,
    versionKey: false,
    minimize: true,
    strict: true
} as const;

/* -------------------- LOCATION -------------------- */

const locationSchema = new Schema<MapLocation>(
    {
        lat: Number,
        lng: Number
    },
    {
        _id: false,
        versionKey: false
    }
);

/* -------------------- SAFE MODEL REGISTRY -------------------- */
/**
 * Prevents OverwriteModelError in dev/hot reload
 */
function getModel<T extends Document>(
    name: string,
    schema: Schema<T>,
    collection: string
): Model<T> {
    return mongoose.models[name] as Model<T> ||
        mongoose.model<T>(name, schema, collection);
}

/* -------------------- RAW RECORD -------------------- */

export interface RawRecordDoc extends RawClinicRecord, Document {}

const RawRecordSchema = new Schema<RawRecordDoc>(
    {
        clinic_id: { type: String, required: true, index: true },
        clinic_name: String,
        city: { type: String, index: true },
        address: String,
        phone: String,
        working_hours: String,
        source_url: { type: String, index: true },

        service_name_raw: String,
        category: { type: String, index: true },

        price_kzt: Number,
        currency: String,
        duration_days: Number,

        parsed_at: { type: Date, index: true },
        is_active: { type: Boolean, index: true },

        location: locationSchema,

        raw_hash: {
            type: String,
            required: true,
            unique: true,
            index: true
        }
    },
    {
        ...schemaOptions,
        collection: "raw_records"
    }
);

RawRecordSchema.index({ raw_hash: 1 }, { unique: true });
RawRecordSchema.index({ clinic_id: 1, service_name_raw: 1 });
RawRecordSchema.index({ city: 1, category: 1 });

export const RawRecord = getModel<RawRecordDoc>(
    "RawRecord",
    RawRecordSchema,
    "raw_records"
);

/* -------------------- OFFER RECORD -------------------- */

export interface OfferRecordDoc extends ClinicServiceOffer, Document {}

const OfferRecordSchema = new Schema<OfferRecordDoc>(
    {
        clinic_id: { type: String, required: true, index: true },
        clinic_name: String,
        city: { type: String, index: true },
        address: String,
        phone: String,
        working_hours: String,

        source_url: { type: String, index: true },

        service_id: { type: String, index: true },
        service_name_raw: String,
        service_name_norm: { type: String, index: true },

        category: { type: String, index: true },

        price_kzt: Number,
        currency: String,
        duration_days: Number,

        parsed_at: { type: Date, index: true },
        is_active: { type: Boolean, index: true },

        location: locationSchema
    },
    {
        ...schemaOptions,
        collection: "offers"
    }
);

OfferRecordSchema.index(
    {
        clinic_id: 1,
        service_id: 1,
        source_url: 1
    },
    { unique: true }
);

OfferRecordSchema.index({ city: 1, category: 1 });
OfferRecordSchema.index({ service_name_norm: 1, price_kzt: 1 });

export const OfferRecord = getModel<OfferRecordDoc>(
    "OfferRecord",
    OfferRecordSchema,
    "offers"
);

/* -------------------- PRICE HISTORY -------------------- */

export interface PriceHistoryDoc extends PriceHistoryEntry, Document {}

const PriceHistorySchema = new Schema<PriceHistoryDoc>(
    {
        clinic_id: { type: String, required: true, index: true },
        service_id: { type: String, index: true },

        clinic_name: String,
        service_name_norm: { type: String, index: true },

        price_kzt: Number,
        parsed_at: { type: Date, index: true },

        source_url: String
    },
    {
        ...schemaOptions,
        collection: "price_history"
    }
);

PriceHistorySchema.index({
    clinic_id: 1,
    service_id: 1,
    parsed_at: -1
});

PriceHistorySchema.index({
    service_name_norm: 1,
    parsed_at: -1
});

export const PriceHistory = getModel<PriceHistoryDoc>(
    "PriceHistory",
    PriceHistorySchema,
    "price_history"
);