import * as cheerio from "cheerio";

const html = await fetch("https://invitro.kz/offices/karaganda/", {
  headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

const $ = cheerio.load(html);
const offices = [];

$("[office-id]").each((_, el) => {
  offices.push({
    id: $(el).attr("office-id"),
    text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 200)
  });
});

console.log("offices with attr", offices.length, offices.slice(0, 5));

const parts = html.split(/office-id="/).slice(1);
console.log("parts", parts.length);
for (const p of parts.slice(0, 5)) {
  const id = p.match(/^(\d+)/)?.[1];
  const addr = p.match(/([А-Яа-яЁё0-9][^<]{10,100}(?:ул\.|пр\.|мкр|просп|микрорайон)[^<]{5,100})/);
  const name = p.match(/class="[^"]*office[^"]*name[^"]*"[^>]*>([^<]+)/i)
    ?? p.match(/>([^<]{5,60})<\/(?:div|span|p|a)[^>]*>\s*<[^>]+>\s*([А-Яа-яЁё0-9][^<]{10,80}(?:ул\.|пр\.|мкр))/);
  console.log({ id, addr: addr?.[1] });
}
