import { fetch } from "undici";

for (const slug of ["karaganda", "almaty", "astana"]) {
    const url = `https://gemotest.kz/${slug}/catalog/`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    const prices = (html.match(/\d[\d\s]{2,}\s*₸/g) ?? []).length;
    console.log(slug, res.status, html.length, "prices", prices, html.slice(0, 80));
}
