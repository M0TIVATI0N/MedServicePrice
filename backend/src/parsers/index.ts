import { RawClinicRecord } from "../models";
import { parseKdlPrices } from "./kdlParser";
import { parseDoqPrices } from "./doqParser";
import { parseInvitroPrices } from "./invitroParser";
import { parseHelixPrices } from "./helixParser";
import { parseGemotestPrices } from "./gemotestParser";
import { capRecords, PARSER_MAX_PER_SOURCE, PARSER_MAX_KDL } from "./config";

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

function capSourceRecords(
    records: RawClinicRecord[],
    label: string,
    max = PARSER_MAX_PER_SOURCE
): RawClinicRecord[] {
    if (records.length <= max) return records;
    console.warn(`${label}: capping ${records.length} → ${max} records`);
    return records.slice(0, max);
}

function deduplicate(records: RawClinicRecord[]): RawClinicRecord[] {
    const map = new Map<string, RawClinicRecord>();

    for (const record of records) {
        const key = [
            record.clinic_id,
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
        if (!records.length) {
            console.warn(`[${source}] WARNING: zero records returned`);
        }
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

        const [doq, invitro, gemotest, helix, kdl] = await Promise.all([
            runSource("DOQ", parseDoqPrices),
            runSource("INVITRO", parseInvitroPrices),
            runSource("GEMOTEST", parseGemotestPrices),
            runSource("HELIX", parseHelixPrices),
            runSource("KDL", parseKdlPrices)
        ]);

        const errors: ParserError[] = [];
        for (const r of [doq, invitro, gemotest, helix, kdl]) {
            if (r.error) errors.push(r.error);
        }

        const all = deduplicate([
            ...capSourceRecords(doq.records, "DOQ"),
            ...capSourceRecords(invitro.records, "INVITRO"),
            ...capSourceRecords(gemotest.records, "GEMOTEST"),
            ...capSourceRecords(helix.records, "HELIX"),
            ...capSourceRecords(kdl.records, "KDL", PARSER_MAX_KDL)
        ]);
        const records = capRecords(all, "ALL_SOURCES");
        const fetchMs = Date.now() - t0;

        console.log(
            `FETCH DONE: ${records.length} records in ${fetchMs}ms`,
            `(DOQ ${doq.records.length}, INVITRO ${invitro.records.length},`,
            `GEMOTEST ${gemotest.records.length}, HELIX ${helix.records.length}, KDL ${kdl.records.length})`,
            `${errors.length} errors`
        );

        return { records, errors, fetchMs };
    })().finally(() => {
        runningPromise = null;
    });

    return runningPromise;
}

export { parseInvitroPrices };
