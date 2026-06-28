const slug = process.argv[2] || "astana";
const html = await fetch(`https://www.kdlolymp.kz/contacts/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

console.log("len", html.length, "slug", slug);

const nuxt = html.match(/window\.__NUXT__\s*=\s*(.+?)<\/script>/s);
if (nuxt) console.log("nuxt head", nuxt[1].slice(0, 800));

const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
console.log("ld+json blocks", ld.length);

const apiRefs = [...html.matchAll(/\/api\/[a-z0-9\-_/]+/gi)].map(m => m[0]);
console.log("api refs", [...new Set(apiRefs)].slice(0, 30));

// look for office-like JSON keys
for (const key of ["procedure_cabinets", "cabinets", "medical_centers", "offices", "branches"]) {
    const idx = html.indexOf(key);
    if (idx >= 0) console.log(key, "at", idx, html.slice(idx, idx + 200));
}

// coords
const coords = html.match(/\d{2}\.\d{4,},\s*\d{2,3}\.\d{4,}/g) || [];
console.log("coords", coords.length, coords.slice(0, 5));

// addresses with street
const streets = html.match(/(?:ул\.|пр\.|проспект|мкр)[^<\"]{8,100}/gi) || [];
console.log("streets", streets.slice(0, 10));
