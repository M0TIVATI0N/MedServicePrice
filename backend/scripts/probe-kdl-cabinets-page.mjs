const slug = process.argv[2] || "astana";
const html = await fetch(`https://www.kdlolymp.kz/cabinets/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

console.log("len", html.length);

const apiRefs = [...html.matchAll(/\/api\/[a-z0-9\-_/]+/gi)].map(m => m[0]);
console.log("api refs", [...new Set(apiRefs)]);

for (const key of ["latitude", "longitude", "address", "cabinet", "office", "procedure"]) {
    const re = new RegExp(key, "gi");
    const count = (html.match(re) || []).length;
    if (count) console.log(key, count);
}

// embedded JSON blobs
const payloads = [...html.matchAll(/\{"id":\d+[^}]{20,400}\}/g)].slice(0, 5);
console.log("json blobs", payloads.length);
for (const m of payloads) console.log(m[0].slice(0, 250));

const streets = html.match(/(?:ул\.|пр\.|проспект|мкр\.|микрорайон)[^<\"]{8,120}/gi) || [];
console.log("streets", streets.length, streets.slice(0, 15));

const coords = html.match(/\d{2}\.\d{4,},\s*\d{2,3}\.\d{4,}/g) || [];
console.log("coords", coords.length, coords.slice(0, 10));
