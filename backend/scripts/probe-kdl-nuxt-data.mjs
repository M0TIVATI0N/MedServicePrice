const slug = process.argv[2] || "astana";
const html = await fetch(`https://www.kdlolymp.kz/cabinets/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (!m) {
    console.log("no __NUXT_DATA__");
    process.exit(1);
}

const data = JSON.parse(m[1]);
console.log("root type", typeof data, Array.isArray(data) ? data.length : "");

function resolve(idx, seen = new Set()) {
    if (idx === null || idx === undefined) return idx;
    if (typeof idx !== "number") return idx;
    if (seen.has(idx)) return "[cycle]";
    seen.add(idx);
    const val = data[idx];
    if (val === null || typeof val !== "object") return val;
    if (Array.isArray(val)) return val.map(v => resolve(v, new Set(seen)));
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = resolve(v, new Set(seen));
    return out;
}

const root = resolve(0);
console.log("root keys", Object.keys(root));

function walk(obj, path = "") {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
        obj.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
    }
    if ("latitude" in obj && "longitude" in obj && ("translation" in obj || "slug" in obj)) {
        console.log("CABINET", JSON.stringify(obj).slice(0, 400));
    }
    for (const [k, v] of Object.entries(obj)) walk(v, path ? `${path}.${k}` : k);
}

walk(root);

// also try to find city cabinets array
const flat = JSON.stringify(root);
const slugIdx = flat.indexOf(`"${slug}"`);
console.log("slug in tree", slugIdx >= 0);
