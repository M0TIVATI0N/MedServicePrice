import { Agent, fetch } from "undici";

const d = new Agent({ connect: { rejectUnauthorized: false } });

async function countProducts(path) {
  const html = await fetch("https://helix.ru" + path, {
    dispatcher: d,
    headers: { "User-Agent": "Mozilla/5.0" }
  }).then(r => r.text());

  const re = /\{"hxid":"([^"]+)"[\s\S]{0,800}?"title":"((?:\\.|[^"\\])*)"[\s\S]{0,200}?"price":\{"value":(\d+)/g;
  let n = 0;
  while (re.exec(html)) n++;
  return n;
}

for (const p of ["/almaty", "/catalog/190-vse-analizy", "/catalog/3-obschij-analiz-krovi", "/catalog/28-biohimicheskie-analizy"]) {
  console.log(p, await countProducts(p));
}
