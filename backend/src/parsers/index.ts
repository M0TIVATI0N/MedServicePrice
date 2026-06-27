import { RawClinicRecord } from "../models";
import { parseKdlPrices } from "./kdlParser";
import { parseDoqPrices } from "./doqParser";
import {
    extractServicesFromText,
    parseDocumentFromUrl,
} from "./documentParser";

let runningPromise: Promise<RawClinicRecord[]> | null = null;

function deduplicate(records: RawClinicRecord[]): RawClinicRecord[] {
    const map = new Map<string, RawClinicRecord>();

    for (const record of records) {
        const key = [
            record.clinic_id,
            record.source_url,
            record.service_name_raw,
            record.price_kzt,
        ].join("|");

        if (!map.has(key)) {
            map.set(key, record);
        }
    }

    return [...map.values()];
}

export async function fetchSourceRecords(): Promise<RawClinicRecord[]> {
    if (runningPromise) {
        console.warn("fetchSourceRecords already running.");
        return runningPromise;
    }

    runningPromise = (async () => {
        console.log("FETCH SOURCE RECORDS START");

        const all: RawClinicRecord[] = [];

        try {
            try {
                console.log("Running KDL parser...");
                const kdl = await parseKdlPrices();

                if (Array.isArray(kdl)) {
                    console.log(`KDL: ${kdl.length}`);
                    for (const item of kdl) {
                        all.push(item);
                    }
                }
            } catch (err) {
                console.error("KDL parser failed:", err);
            }

            try {
                console.log("Running DOQ parser...");
                const doq = await parseDoqPrices();

                if (Array.isArray(doq)) {
                    console.log(`DOQ: ${doq.length}`);
                    for (const item of doq) {
                        all.push(item);
                    }
                }
            } catch (err) {
                console.error("DOQ parser failed:", err);
            }

            const unique = deduplicate(all);

            console.log(
                `Collected ${all.length} records (${unique.length} unique)`
            );

            return unique;
        } finally {
            runningPromise = null;
        }
    })();

    return runningPromise;
}

export {
    parseDocumentFromUrl,
    extractServicesFromText,
};