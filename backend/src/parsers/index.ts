import { RawClinicRecord } from "../models";
import { parseKdlPrices } from "./kdlParser";
import { parseDoqPrices } from "./doqParser";
import { parseInvitroPrices } from "./invitroParser";
import { parseHelixPrices } from "./helixParser";
import { parseGemotestPrices } from "./gemotestParser";
import { capRecords } from "./config";
export interface ParserError {
    source: string;
    message: string;
}

export interface ParserFetchResult {
    records: RawClinicRecord[];
    errors: ParserError[];
    fetchMs: number;
}

let runningPromise: Promise<ParserFetchResult> | null = null;

function deduplicate(records: RawClinicRecord[]): RawClinicRecord[] {
    const map = new Map<string, RawClinicRecord>();

    for (const record of records) {
        const key = [
            record.clinic_id,
            record.source_url,
            record.service_name_raw,
            record.price_kzt
        ].join("|");

        if (!map.has(key)) {
            map.set(key, record);
        }
    }

    return [...map.values()];
}

async function runSource(
    source: string,
    fn: () => Promise<RawClinicRecord[]>
): Promise<{ records: RawClinicRecord[]; error?: ParserError; ms: number }> {
    const t0 = Date.now();
    try {
        console.log(`[${source}] start`);
        const records = await fn();
        const ms = Date.now() - t0;
        console.log(`[${source}] done: ${records.length} records in ${ms}ms`);
        return { records: Array.isArray(records) ? records : [], ms };
    } catch (err: any) {
        const ms = Date.now() - t0;
        const message = err?.message ?? String(err);
        console.error(`[${source}] failed in ${ms}ms:`, message);
        return {
            records: [],
            ms,
            error: { source, message }
        };
    }
}

export async function fetchSourceRecords(): Promise<ParserFetchResult> {
    if (runningPromise) {
        console.warn("fetchSourceRecords already running.");
        return runningPromise;
    }

    runningPromise = (async () => {
        console.log("FETCH SOURCE RECORDS START (parallel)");
        const t0 = Date.now();

        const [kdl, doq, invitro, helix, gemotest] = await Promise.all([
            runSource("KDL", parseKdlPrices),
            runSource("DOQ", parseDoqPrices),
            runSource("INVITRO", parseInvitroPrices),
            runSource("HELIX", parseHelixPrices),
            runSource("GEMOTEST", parseGemotestPrices)
        ]);

        const errors: ParserError[] = [];
        for (const r of [kdl, doq, invitro, helix, gemotest]) {
            if (r.error) errors.push(r.error);
        }

        const all = deduplicate([
            ...kdl.records,
            ...doq.records,
            ...invitro.records,
            ...helix.records,
            ...gemotest.records
        ]);
        const records = capRecords(all, "ALL_SOURCES");
        const fetchMs = Date.now() - t0;

        console.log(
            `FETCH DONE: ${records.length} records in ${fetchMs}ms, ${errors.length} errors`
        );

        return { records, errors, fetchMs };
    })().finally(() => {
        runningPromise = null;
    });

    return runningPromise;
}

export { parseInvitroPrices };

