import * as cheerio from "cheerio";

const html = await fetch("https://www.kdlolymp.kz/contacts/karaganda", {
  headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

const $ = cheerio.load(html);
$("*").each((_, el) => {
  const cls = $(el).attr("class") ?? "";
  if (/office|point|branch|contact-card|med/i.test(cls)) {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length > 20 && t.length < 300) console.log(cls, "=>", t);
  }
});

// find karaganda section
const karIdx = html.indexOf("Караганда");
console.log("karaganda idx", karIdx);
if (karIdx > 0) console.log(html.slice(karIdx - 100, karIdx + 800));
