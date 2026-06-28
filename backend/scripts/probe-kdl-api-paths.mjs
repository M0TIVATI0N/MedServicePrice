const cityId = Number(process.argv[2] || 98);
const citySlug = process.argv[3] || "astana";

const url =
    `https://www.kdlolymp.kz/api/procedure-cabinet?lang=ru-RU&city_id=${cityId}`;
const json = await fetch(url, {
    headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Cookie: `accepted-city=${cityId}; currentCity=${cityId}`,
        Referer: `https://www.kdlolymp.kz/cabinets/${citySlug}`
    }
}).then(r => r.json());

const list = json.data ?? [];
console.log("count", list.length);
console.log(JSON.stringify(list[0], null, 2));
if (list[1]) console.log("--- second ---", JSON.stringify(list[1], null, 2).slice(0, 800));
