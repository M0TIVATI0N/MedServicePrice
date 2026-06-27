import * as cheerio from "cheerio";

const html = await fetch("https://invitro.kz/analizes/for-doctors/karaganda/", {
  headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

const $ = cheerio.load(html);
const cats = [];
$("a[href*='/analizes/for-doctors/karaganda/']").each((_, a) => {
  const href = $(a).attr("href") ?? "";
  const m = href.match(/\/(\d+)\/?$/);
  if (m) cats.push(m[1]);
});
console.log("categories", [...new Set(cats)]);
