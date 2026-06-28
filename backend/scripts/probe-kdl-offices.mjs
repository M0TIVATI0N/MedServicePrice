const slug = process.argv[2] || "astana";
const html = await fetch(`https://www.kdlolymp.kz/cabinets/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
const data = JSON.parse(m[1]);

function resolve(idx, seen = new Set()) {
    if (idx === null || idx === undefined) return idx;
    if (typeof idx !== "number") return idx;
    if (seen.has(idx)) return null;
    seen.add(idx);
    const val = data[idx];
    if (val === null || typeof val !== "object") return val;
    if (Array.isArray(val)) return val.map(v => resolve(v, new Set(seen)));
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = resolve(v, new Set(seen));
    return out;
}

const root = resolve(0);
const offices = [];

function walk(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
        obj.forEach(walk);
        return;
    }
    const addr =
        obj.translation?.address ??
        obj.address ??
        obj.streetAddress ??
        "";
    const title = obj.translation?.title ?? obj.title ?? "";
    const lat = Number(obj.latitude);
    const lng = Number(obj.longitude);
    if (
        typeof addr === "string" &&
        addr.length > 8 &&
        /ул\.|пр\.|мкр|проспект|д\./i.test(addr) &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    ) {
        offices.push({ id: obj.id, title, addr, lat, lng, slug: obj.slug });
    }
    for (const v of Object.values(obj)) walk(v);
}

walk(root);
console.log("offices with street address:", offices.length);
for (const o of offices.slice(0, 20)) {
    console.log(JSON.stringify(o));
}

// city slug filter
const cityOffices = offices.filter(
    o => o.slug === slug || o.title?.toLowerCase().includes(slug)
);
console.log("for slug", slug, cityOffices.length);
