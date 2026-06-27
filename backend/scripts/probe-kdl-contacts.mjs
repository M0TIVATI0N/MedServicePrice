import * as cheerio from "cheerio";

const html = await fetch("https://www.kdlolymp.kz/contacts/karaganda", {
  headers: { "User-Agent": "Mozilla/5.0" }
}).then(r => r.text());

const $ = cheerio.load(html);
console.log("title", $("title").text());

$("[class*='contact'], [class*='office'], [class*='address'], [class*='map']").each((i, el) => {
  if (i > 15) return;
  const cls = $(el).attr("class");
  const t = $(el).text().replace(/\s+/g, " ").trim().slice(0, 120);
  if (t.length > 10) console.log(cls, "=>", t);
});

const scripts = [];
$("script").each((_, s) => {
  const t = $(s).html() ?? "";
  if (t.includes("office") || t.includes("address") || t.includes("latitude")) {
    scripts.push(t.slice(0, 500));
  }
});
console.log("scripts with geo", scripts.length);
if (scripts[0]) console.log(scripts[0].slice(0, 800));
