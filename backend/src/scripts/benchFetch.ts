import { fetchSourceRecords } from "../parsers";

fetchSourceRecords()
    .then(r => {
        console.log("\n=== RESULT ===");
        console.log("records:", r.records.length);
        console.log("errors:", r.errors.length, r.errors);
        console.log("fetchMs:", r.fetchMs, `(${(r.fetchMs / 1000).toFixed(1)}s)`);
        process.exit(r.errors.length > 0 ? 1 : 0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
